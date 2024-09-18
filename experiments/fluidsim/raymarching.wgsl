struct Uniforms {
  viewMatrix: mat4x4f,
  @align(16) cameraPos: vec3f,
  resolution: vec2f,
  time: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(1) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var renderTexture: texture_2d<f32>;
@group(0) @binding(2) var textureSampler: sampler;
@group(0) @binding(3) var volumeTexture: texture_3d<f32>;
@group(0) @binding(4) var volumeSampler: sampler;
@group(0) @binding(5) var depthTexture: texture_depth_2d;

const EPSILON: f32 = 0.001;
const start: f32 = 0.0;
const end: f32 = 128.0;

// These should be uniforms
const fov: f32 = 45.0;
// Volume
const densityThreshold: f32 = 0.1;
const densityMultiplier: f32 = 1.0;
const marchingSteps: i32 = 100;
const minBounds: vec3f = vec3f(-2.0);
const maxBounds: vec3f = vec3f(2.0);

// Lighting
const lightDir: vec3f = normalize(vec3f(0.01, 0.5, -1.0));
const lightColor: vec3f = vec3f(1.0, 0.7, 0.3);
const numStepsLight: i32 = 4;
const darknessThreshold: f32 = 0.0;
const lightAbsortionThroughCloud: f32 = 0.5;
const lightAbsortionToSource: f32 = 1.0;
const phaseVal: f32 = 0.5;

const nearPlane : f32 = 0.1;
const farPlane : f32 = 1000.0;

fn rayBoxDst(boundsMin: vec3f, boundsMax: vec3f, rayOrigin: vec3f, rayDir : vec3f ) -> vec2f {
    let t0 : vec3f = (boundsMin - rayOrigin) / rayDir;
    let t1 : vec3f = (boundsMax - rayOrigin) / rayDir;
    let tmin : vec3f = min(t0, t1);
    let tmax : vec3f = max(t0, t1);

    let dstA : f32 = max(max(tmin.x, tmin.y), tmin.z);
    let dstB : f32 = min(tmax.x, min(tmax.y, tmax.z));

    let dstToBox : f32 = max(0.0, dstA);
    let dstInsideBox : f32 = max(0.0, dstB - dstToBox);
    return vec2f(dstToBox, dstInsideBox);
}

fn sampleDensity(position: vec3f) -> f32 {
  let cubeSize = maxBounds - minBounds;
  let texCoord: vec3f = position/cubeSize + 0.5;
  let texel: vec4f = textureSampleLevel(volumeTexture, volumeSampler, texCoord, 0.0, vec3i(0));
  return max(0.0, texel.r - densityThreshold) * densityMultiplier;
}

fn box(position: vec3f, center: vec3f, size: vec3f) -> f32 {
  let q : vec3f = abs(position - center) - size;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y,q.z)), 0.0);
}

fn lightmarch(position: vec3f) -> f32 {
    let dstInsideBox: f32 = rayBoxDst(minBounds, maxBounds, position, 1.0/lightDir).y;

    let stepSize: f32 = dstInsideBox/f32(numStepsLight);
    var totalDensity: f32 = 0.0;

    var pos = position;
    for (var step = 0; step < numStepsLight; step += 1) {
        pos += lightDir * stepSize;
        totalDensity += max(0.0, sampleDensity(pos) * stepSize);
    }

    let transmittance: f32 = exp(-totalDensity * lightAbsortionToSource);
    return darknessThreshold + transmittance * (1.0-darknessThreshold);
}

fn raymarch(eye: vec3f, viewRayDirection: vec3f, backgroundColor: vec3f, depth: f32) -> vec4f {
    let rayBoxInfo: vec2f = rayBoxDst(minBounds, maxBounds, eye, viewRayDirection);
    let dstToBox: f32 = rayBoxInfo.x;
    let dstInsideBox: f32 = rayBoxInfo.y;

    // If the ray doesn't intersect the volume bounds, return the background color
    if (dstInsideBox <= 0.0) {
        return vec4f(backgroundColor, 1.0);
    }

    var dstTravelled: f32 = 0.0;
    let stepSize: f32 = dstInsideBox / f32(marchingSteps);
    let dstLimit: f32 = dstInsideBox;

    var transmittance: f32 = 1.0;
    var lightEnergy: f32 = 0.0;
    var totalDensity = 0.0;
    
    while (dstTravelled < dstLimit) {
        let currentDst = dstToBox + dstTravelled;
        
        if (currentDst/2.0 >= depth) {
            break;
        }
        
        let rayPos: vec3f = eye + viewRayDirection * currentDst;
        let density = sampleDensity(rayPos);

        if (density > 0.0) {
            totalDensity += density*0.05;
            let lightTransmittance: f32 = lightmarch(rayPos);
            lightEnergy += density * stepSize * transmittance * lightTransmittance * phaseVal;
            transmittance *= exp(-density * stepSize * lightAbsortionThroughCloud);

            if (transmittance < 0.01) {
                break;
            }
        }
        dstTravelled += stepSize;
    }

    let densityColor = mix(vec3f(0.2, 0.2, 0.6), vec3f(1.0, 0.9, 0.8), totalDensity); // Fire color effect
    let cloudCol: vec3f = densityColor * lightEnergy * lightColor;
    let volumeCol: vec3f = backgroundColor * transmittance + cloudCol;
    
    return vec4f(volumeCol, 1.0);
}

fn rayDirection(fieldOfView: f32, size: vec2f, fragCoord: vec2f) -> vec3f {
    let aspect = size.x / size.y;
    let fov = radians(fieldOfView);
    let screenPos = (fragCoord / size) * 2.0 - 1.0;
    return normalize(vec3f(screenPos.x * aspect * tan(fov/2.0), 
                           -screenPos.y * tan(fov/2.0), 
                           -1.0));
}

fn virtualViewMatrix(eye: vec3f, center: vec3f, up: vec3f) -> mat4x4f {
    // Based on gluLookAt man page
    let f = normalize(center - eye);
    let s = normalize(cross(f, up));
    let u = cross(s, f);
    return mat4x4f(
        vec4f(s, 0.0),
        vec4f(u, 0.0),
        vec4f(-f, 0.0),
        vec4f(eye, 1.0)
    );
}



fn linearizeDepth(depthSample: f32) -> f32 {
    let z_n = 2.0 * depthSample - 1.0;
    return 2.0 * nearPlane * farPlane / (farPlane + nearPlane - z_n * (farPlane - nearPlane));
}

fn worldSpaceDepth(linearDepth: f32, rayDir: vec3f) -> f32 {
    return length(linearDepth * rayDir);
}

@vertex
fn vertexMain(@location(0) pos: vec3f, @location(1) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  out.position = vec4f(pos, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
  let sampledColor = textureSample(renderTexture, textureSampler, in.uv);
  let meshDepth = textureLoad(depthTexture, vec2<i32>(in.position.xy), 0);

  var cameraDir: vec3f = rayDirection(fov, uniforms.resolution, in.position.xy);
  let viewMatrix = virtualViewMatrix(uniforms.cameraPos, vec3f(0.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0));
  cameraDir = normalize((viewMatrix * vec4f(cameraDir, 0.0)).xyz);

  let linearDepth = linearizeDepth(meshDepth);
  let depthWorldSpace = worldSpaceDepth(linearDepth, cameraDir);
  let col: vec4f = raymarch(uniforms.cameraPos, cameraDir, sampledColor.rgb, depthWorldSpace);
  return col;
}