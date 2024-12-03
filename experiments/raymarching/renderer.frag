uniform vec2 resolution;
uniform float fov;
uniform vec3 cameraPos;
uniform vec3 cameraTarget;
uniform float fractalPower;
uniform int fractalIterations;
uniform int maxMarchingSteps;
uniform bool phongShaded;

float EPSILON = 0.0001;
float start = 0.0;
float end = 32.0;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float sphere(vec3 position, vec3 center, float radius) {
    return length(position - center) - radius;
}

float box(vec3 position, vec3 center, vec3 size) {
  vec3 q = abs(position - center) - size;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y,q.z)), 0.0);
}

float mandelbulbSDF(vec3 p, float power, int iterations) {
  float dr = 1.0;
  float r = 0.0;

  for (int i = 0; i < iterations; i++) {
    r = length(p);
    if (r > 2.0) break;

    // Convert to polar coordinates
    float theta = acos(p.z / r) * power;
    float phi = atan(p.y, p.x) * power;

    // Scale and rotate
    float zr = pow(r, power);
    theta *= power;
    phi *= power;

    // Convert back to Cartesian coordinates
    p = vec3(
      sin(theta) * cos(phi),
      sin(phi) * sin(theta),
      cos(theta)
    ) * zr + p;

    // Update the distance estimation
    dr = pow(r, power - 1.0) * power * dr + 1.0;
  }

  return 0.5 * log(r) * r / dr;
}


float smoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); 
}

float sceneSDF(vec3 position) {
    // float distance = sphere(position, vec3(0.0, 0.0, 0.0), 1.0);
    // distance = smoothUnion(distance, box(position, vec3(1.0, -1.0, 0.0), vec3(0.5)), 0.5);
    // return smoothUnion(distance, sphere(position, vec3(-1.5, 0.0, 0.0), 0.8), 0.5);
    return mandelbulbSDF(position, fractalPower, fractalIterations);
}

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,
                          vec3 lightPos, vec3 lightIntensity) {
    vec3 N = estimateNormal(p);
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));
    
    float dotLN = dot(L, N);
    float dotRV = dot(R, V);
    
    if (dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    } 
    
    if (dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (k_d * dotLN);
    }
    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
}

vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {
    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;
    
    vec3 lightPos = vec3(4.0, 2.0, 4.0);
    vec3 lightIntensity = vec3(0.4);
    color += phongContribForLight(k_d, k_s, alpha, p, eye, lightPos, lightIntensity);

    lightPos = vec3(-4.0, 0.0, -1.0);
    lightIntensity = vec3(0.2);
    color += phongContribForLight(k_d, k_s, alpha, p, eye, lightPos, lightIntensity);

    return color;
}

float raymarch(vec3 eye, vec3 viewRayDirection) {
    float offsetModifier = rand(gl_FragCoord.xy) * 0.5;
    float depth = start + offsetModifier;
    for (int i = 0; i < maxMarchingSteps; i++) {
        float dist = sceneSDF(eye + depth * viewRayDirection);
        if (dist < EPSILON) {
            return mix(float(i)/float(maxMarchingSteps), depth, phongShaded);
        }
        depth += dist;

        if (depth >= end) {
            return mix(float(i)/float(maxMarchingSteps), end, phongShaded);
        }
    }
    return end;
}

mat4 virtualViewMatrix(vec3 eye, vec3 center, vec3 up) {
    vec3 f = normalize(center - eye);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat4(
        vec4(s, 0.0),
        vec4(u, 0.0),
        vec4(-f, 0.0),
        vec4(0.0, 0.0, 0.0, 1)
    );
}

vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

void main() {
    vec3 cameraDir = rayDirection(fov, resolution.xy, gl_FragCoord.xy);
    mat4 transformation = virtualViewMatrix(cameraPos, cameraTarget, vec3(0.0, 1.0, 0.0));
    cameraDir = (transformation * vec4(cameraDir, 0.0)).xyz;

    float t = raymarch(cameraPos, cameraDir);
    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0, 0.8, 0.1), t), 1.0);

    if (phongShaded) {
        vec3 p = cameraPos + t * cameraDir;

        vec3 ambient = vec3(0.2, 0.2, 0.2);
        vec3 diffuse = vec3(0.9, 0.1, 1.0);
        vec3 specular = vec3(1.0);
        float shininess = 10.0;
        
        vec3 color = phongIllumination(ambient, diffuse, specular, shininess, p, cameraPos);

        gl_FragColor = vec4(color, 1.0);
    }
}