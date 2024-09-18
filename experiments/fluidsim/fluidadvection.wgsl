struct Uniforms {
    size: vec3f,
    padding: f32,
    mousePos: vec3f,
    padding2: f32,
    time: f32,
}

@group(0) @binding(0) var solid : texture_3d<f32>;
@group(0) @binding(1) var<uniform> uniforms : Uniforms;
@group(0) @binding(2) var velocityX : texture_3d<f32>;
@group(0) @binding(3) var velocityY : texture_3d<f32>;
@group(0) @binding(4) var velocityZ : texture_3d<f32>;
@group(0) @binding(5) var newVelocityX : texture_storage_3d<r32float, write>;
@group(0) @binding(6) var newVelocityY : texture_storage_3d<r32float, write>;
@group(0) @binding(7) var newVelocityZ : texture_storage_3d<r32float, write>;
@group(0) @binding(8) var density : texture_3d<f32>;
@group(0) @binding(9) var newDensity : texture_storage_3d<r32float, write>;
@group(0) @binding(10) var volumeSampler: sampler;

const deltaTime = 0.001;
const drag = .99;

// Simplex 2D noise
fn mod3(x: vec3f, y: f32) -> vec3f {return x - y * floor(x / y);}
fn mod2(x: vec2f, y: f32) -> vec2f {return x - y * floor(x / y);}
fn permute(x: vec3f) -> vec3f { return mod3(((x*34.0)+1.0)*x, 289.0); }

fn snoise(v : vec2f) -> f32 {
  let C : vec4f = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  var i : vec2f  = floor(v + dot(v, C.yy) );
  let x0 : vec2f = v -   i + dot(i, C.xx);
  var i1 : vec2f = vec2f(0.0, 1.0);
  if (x0.x > x0.y) {
    i1 = vec2(1.0, 0.0);
  }
  var x12: vec4f = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);
  i = mod2(i, 289.0);
  let p: vec3f = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  var m: vec3f = max(0.5 - vec3f(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), vec3f(0.0));
  m = m*m ;
  m = m*m ;
  let x: vec3f = 2.0 * fract(p * C.www) - 1.0;
  let h: vec3f = abs(x) - 0.5;
  let ox: vec3f = floor(x + 0.5);
  let a0: vec3f = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  var g : vec3f;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  let temp : vec2f = a0.yz * x12.xz + h.yz * x12.yw;
  g.y = temp.x;
  g.z = temp.y;
  return 130.0 * dot(m, g);
}

fn sampleVelocity(pos: vec3f) -> vec3f {
    let size = uniforms.size;
    let texCoord = pos / size;
    
    if (any(texCoord < vec3f(0.0)) || any(texCoord > vec3f(1.0))) {
        return vec3f(0.0);
    }
    
    return vec3f(
        textureSampleLevel(velocityX, volumeSampler, texCoord, 0, vec3i(0)).x,
        textureSampleLevel(velocityY, volumeSampler, texCoord, 0, vec3i(0)).x,
        textureSampleLevel(velocityZ, volumeSampler, texCoord, 0, vec3i(0)).x
    );
}

fn sampleDensity(pos: vec3f) -> f32 {
    let size = uniforms.size;
    let texCoord = pos / size;
    
    if (any(texCoord < vec3f(0.0)) || any(texCoord > vec3f(1.0))) {
        return 0.0;
    }
    
    return textureSampleLevel(density, volumeSampler, texCoord, 0, vec3i(0)).r;
}

@compute @workgroup_size(8, 4, 8)
fn advection(@builtin(global_invocation_id) id : vec3<u32>) {
    let size = vec3u(uniforms.size);

    if (id.x < size.x && id.y < size.y && id.z < size.z) {
        let solidValue = textureLoad(solid, id, 0).r;
        if (solidValue == 0.0) { 
            textureStore(newVelocityX, id, vec4f(0.0));
            textureStore(newVelocityY, id, vec4f(0.0));
            textureStore(newVelocityZ, id, vec4f(0.0));
            textureStore(newDensity, id, vec4f(0.0));
            return;
        }
        
        let pos = vec3f(id);
        let vel = sampleVelocity(pos);
        
        let cellSize = uniforms.size.x / 16.0;
        let backtrackedPos = pos - vel * deltaTime / (cellSize/uniforms.size.x);
        
        let newVel = sampleVelocity(backtrackedPos);
        let newDens = sampleDensity(backtrackedPos);

        var finalVel = newVel * drag;
        var finalDens = newDens * 1.0;

        // Add source
        // Noise blower mode
        let center = vec3f(uniforms.size.x/2.0, uniforms.size.y/4.0, uniforms.size.z/2.0);
        let dist = distance(pos, center);
        if (dist < uniforms.size.x/16.0) {
            let sourceVelocity = 40.0 * normalize(vec3f(
                snoise(vec2f(0.0, uniforms.time)), 
                snoise(vec2f(64.315, uniforms.time)), 
                snoise(vec2f(-256.7844, uniforms.time))
            ));
            finalVel += sourceVelocity;
            finalDens += clamp(8.0/dist, 0.1, 2.0);
        }
        let noiseScale = uniforms.size.x/10.0;
        let baseVelocity = normalize(vec3f(
          snoise(vec2f(f32(id.x)/noiseScale, uniforms.time)), 
          snoise(vec2f(f32(id.y)/noiseScale, uniforms.time)), 
          snoise(vec2f(f32(id.z)/noiseScale, uniforms.time))));
        finalVel += baseVelocity;

        // Noise everywhere mode
        // finalDens += 0.01*(snoise(vec2f(f32(id.x+id.z+id.y)/10.0, uniforms.time))+1.0);
        // let baseVelocity = normalize(vec3f(
        //   snoise(vec2f(f32(id.x), uniforms.time)), 
        //   snoise(vec2f(f32(id.y), uniforms.time)), 
        //   snoise(vec2f(f32(id.z), uniforms.time))));
        // finalVel += baseVelocity;

        let mouseDist = distance(pos, uniforms.mousePos);
        let mouseRadius = uniforms.size.x/8.0;
        if (mouseDist < mouseRadius) {
            let mouseInfluence = 1.0 - (mouseDist / mouseRadius);
            finalDens += 2.0 * mouseInfluence;
            
            let avoidMouse = normalize(pos - uniforms.mousePos);
            finalVel += 50.0 * mouseInfluence * avoidMouse;
        }

        textureStore(newVelocityX, id, vec4f(finalVel.x));
        textureStore(newVelocityY, id, vec4f(finalVel.y));
        textureStore(newVelocityZ, id, vec4f(finalVel.z));
        textureStore(newDensity, id, vec4f(finalDens));
    }
}