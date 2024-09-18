struct Uniforms {
    @align(16) size: vec3f,
    time: f32
}

@group(0) @binding(0) var solid : texture_3d<f32>;
@group(0) @binding(1) var<uniform> uniforms : Uniforms;
@group(0) @binding(2) var velocityX : texture_3d<f32>;
@group(0) @binding(3) var velocityY : texture_3d<f32>;
@group(0) @binding(4) var velocityZ : texture_3d<f32>;
@group(0) @binding(5) var newVelocityX : texture_storage_3d<r32float, write>;
@group(0) @binding(6) var newVelocityY : texture_storage_3d<r32float, write>;
@group(0) @binding(7) var newVelocityZ : texture_storage_3d<r32float, write>;

const overrelaxation : f32 = 2.9;

@compute @workgroup_size(8, 4, 8)
fn projection(@builtin(global_invocation_id) id : vec3<u32>) {
    let size : vec3u = vec3u(uniforms.size);

    if (id.x > 0 && id.y > 0 && id.z > 0 && id.x < size.x - 1 && id.y < size.y - 1 && id.z < size.z - 1) {
        let vXcurrent = textureLoad(velocityX, id, 0).r;
        let vXnext = textureLoad(velocityX, vec3u(id.x + 1, id.y, id.z), 0).r;
        let vYcurrent = textureLoad(velocityY, id, 0).r;
        let vYnext = textureLoad(velocityY, vec3u(id.x, id.y + 1, id.z), 0).r;
        let vZcurrent = textureLoad(velocityZ, id, 0).r;
        let vZnext = textureLoad(velocityZ, vec3u(id.x, id.y, id.z + 1), 0).r;
        
        let divergence: f32 = vXnext - vXcurrent + vYnext - vYcurrent + vZnext - vZcurrent;
        let d: f32 = overrelaxation * divergence / 6.0;
        let solidXprev = textureLoad(solid, vec3u(id.x - 1, id.y, id.z), 0).r;
        let solidXnext = textureLoad(solid, vec3u(id.x + 1, id.y, id.z), 0).r;
        let solidYprev = textureLoad(solid, vec3u(id.x, id.y - 1, id.z), 0).r;
        let solidYnext = textureLoad(solid, vec3u(id.x, id.y + 1, id.z), 0).r;
        let solidZprev = textureLoad(solid, vec3u(id.x, id.y, id.z - 1), 0).r;
        let solidZnext = textureLoad(solid, vec3u(id.x, id.y, id.z + 1), 0).r;
        let s : f32 = max(0.01, solidXprev + solidXnext + solidYprev + solidYnext + solidZprev + solidZnext);

        textureStore(newVelocityX, id, vec4f(vXcurrent + d * solidXprev/s));
        textureStore(newVelocityX, vec3u(id.x + 1, id.y, id.z), vec4f(vXnext - d * solidXnext/s));
        textureStore(newVelocityY, id, vec4f(vYcurrent + d * solidYprev/s));
        textureStore(newVelocityY, vec3u(id.x, id.y + 1, id.z), vec4f(vYnext - d * solidYnext/s));
        textureStore(newVelocityZ, id, vec4f(vZcurrent + d * solidZprev/s));
        textureStore(newVelocityZ, vec3u(id.x, id.y, id.z + 1), vec4f(vZnext - d * solidZnext/s));
    }
}