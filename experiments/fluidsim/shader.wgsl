struct Uniforms {
  cameraMatrix: mat4x4f,
  modelMatrix: mat4x4f,
  lightColor: vec4f,
  @align(16) lightDirection: vec3f,
  @align(16) camPos: vec3f,
  time: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) vertexPosition: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var albedo: texture_2d<f32>;
@group(0) @binding(2) var specular: texture_2d<f32>;
@group(0) @binding(3) var textureSampler: sampler;

const fogNear: f32 = 5.0;
const fogFar: f32 = 10.0;
const fogColor: vec3f = vec3f(0.0, 0.0, 0.0);

fn computeFogFactor(distance: f32, fogNear: f32, fogFar: f32) -> f32 {
    return clamp((distance - fogNear) / (fogFar - fogNear), 0.0, 1.0);
}

fn directionalLight(in : VertexOutput) -> vec4f
{
	let ambient : f32 = 0.2;

	let normal: vec3f = normalize(in.normal);
	let diffuse: f32 = max(dot(normal, uniforms.lightDirection), 0.0f);

	let specularLight: f32 = .7f;
	let viewDirection: vec3f = normalize(uniforms.camPos - in.vertexPosition.xyz);
	let reflectionDirection: vec3f = reflect(-uniforms.lightDirection, normal);
	let specAmount: f32 = pow(max(dot(viewDirection, reflectionDirection), 0.0f), 128);
	let spec: f32 = specAmount * specularLight;

	return (textureSample(albedo, textureSampler, in.uv) * (diffuse + ambient) + textureSample(specular, textureSampler, in.uv).r * spec) * uniforms.lightColor;
}

@vertex
fn vertexMain(@location(0) pos: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f) -> VertexOutput {
  var out: VertexOutput;
  out.vertexPosition = (uniforms.modelMatrix * vec4f(pos, 1)).xyz;
  out.position = uniforms.cameraMatrix * vec4f(out.vertexPosition, 1);
  out.normal = normal;
  out.uv = uv;
  return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
    let color = directionalLight(in);

    let center = vec3f(0.0, in.vertexPosition.y, 0.0);
    let foggedColor = mix(color.rgb, vec3f(0.0), smoothstep(2.0, 3.0, distance(in.vertexPosition, center)));
    
    return vec4f(foggedColor, color.a);
}