struct Uniforms {
    @align(16) size: vec3f,
    time: f32
}

@group(0) @binding(0) var densityTexture : texture_storage_3d<r32float, write>;
@group(0) @binding(1) var<uniform> uniforms : Uniforms;
@group(0) @binding(2) var velocityX : texture_storage_3d<r32float, write>;
@group(0) @binding(3) var velocityY : texture_storage_3d<r32float, write>;
@group(0) @binding(4) var velocityZ : texture_storage_3d<r32float, write>;

fn random(co: vec2f) -> f32 {
    return 2.0 * fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) - 1.0;
}

@compute @workgroup_size(8, 4, 8)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
    let size : vec3u = vec3u(uniforms.size);
    let center = uniforms.size / 2.0;
    let radius = uniforms.size.x / 2.0;

    if (id.x < size.x && id.y < size.y && id.z < size.z) {
        let pos = vec3<f32>(id);
        let distance = distance(pos, center);

        // Initial huge density sphere
        if (distance <= radius) {
            textureStore(densityTexture, id, vec4<f32>(1.0, 0.0, 0.0, 0.0));
        } else {
            textureStore(densityTexture, id, vec4<f32>(0.0, 0.0, 0.0, 0.0));
        }

        let awayFromCenter = 100.0*(pos - center);

        textureStore(velocityX, id, vec4f(100.0*random(vec2f(id.xy)), 0.0, 0.0, 0.0));
        textureStore(velocityY, id, vec4f(100.0*random(vec2f(id.yz)), 0.0, 0.0, 0.0));
        textureStore(velocityZ, id, vec4f(100.0*random(vec2f(id.xz)), 0.0, 0.0, 0.0));
        // textureStore(velocityX, id, vec4f(awayFromCenter.x, 0.0, 0.0, 0.0));
        // textureStore(velocityY, id, vec4f(awayFromCenter.y, 0.0, 0.0, 0.0));
        // textureStore(velocityZ, id, vec4f(awayFromCenter.z, 0.0, 0.0, 0.0));
    }
}