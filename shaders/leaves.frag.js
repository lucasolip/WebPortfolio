export default `
#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
    vec3 direction;
    vec3 color;
};
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif

uniform sampler2D uColorMap;
uniform sampler2D uNormalMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat4 vModelViewMatrix;
uniform vec3 ambientLightColor;


vec4 phong() {
    vec4 color = texture2D(uColorMap, vUv);
    if (color.a < 0.5) {
        discard;
    }

    vec3 normal = vNormal;
    if (!gl_FrontFacing) {
        normal = -normal;
    }
    normal = normal + texture2D(uNormalMap, vUv).rgb;
    vec3 n = normalize(vec3(vModelViewMatrix * vec4(normal, 0.0)));
    //vec3 n = normalize(vNormal * texture2D(uNormalMap, vUv).rgb * 2.0 - 1.0);
    // vec3 n = normalize(vNormal);

    vec3 s = normalize(directionalLights[0].direction);
    vec3 v = normalize(vec3(cameraPosition-vPosition));
    vec3 r = reflect(-s, n);

    float Shininess = 16.0;
    vec3 LightIntensity = vec3(1.0);
    vec3 ambient = 0.2*ambientLightColor;
    vec3 diffuse = vec3(color) * max(dot(s, n), 0.0);
    vec3 specular = 0.1 * vec3(1.0) * pow(max(dot(r, v), 0.0), Shininess);

    return vec4(LightIntensity * (ambient + diffuse + specular), color.a);
    //return n;
    //return texture2D(uNormalMap, vUv).rgb;
}

void main() {
    vec3 color = vec3(0.0);
    if (gl_FrontFacing) {
        color = vec3(1.0,0.0,0.0);
    }
    gl_FragColor = phong();//vec4(color, 1.0);
}
`;