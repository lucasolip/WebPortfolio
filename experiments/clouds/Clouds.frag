precision highp float;
precision highp sampler3D;

// Camera
uniform vec2 resolution;
uniform float fov;
uniform vec3 cameraPos;

// Volume
uniform float cloudScale;
uniform vec3 cloudOffset;
uniform float detailScale;
uniform vec3 detailOffset;
uniform float mainWeight;
uniform float detailWeight;
uniform float densityThreshold;
uniform float densityMultiplier;
uniform int marchingSteps;
uniform vec3 minBounds;
uniform vec3 maxBounds;
uniform sampler3D mainTex;
uniform sampler3D detailTex;

// Lighting
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform int numStepsLight;
uniform float darknessThreshold;
uniform float lightAbsortionThroughCloud;
uniform float lightAbsortionToSource;
uniform float phaseVal;


float EPSILON = 0.001;
float start = 0.0;
float end = 128.0;

vec2 rayBoxDst(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 rayDir) {
    vec3 t0 = (boundsMin - rayOrigin) / rayDir;
    vec3 t1 = (boundsMax - rayOrigin) / rayDir;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);

    float dstA = max(max(tmin.x, tmin.y), tmin.z);
    float dstB = min(tmax.x, min(tmax.y, tmax.z));

    float dstToBox = max(0.0, dstA);
    float dstInsideBox = max(0.0, dstB - dstToBox);
    return vec2(dstToBox, dstInsideBox);
}

float sampleDensity(vec3 position) {
    vec3 texCoord = position * cloudScale * 0.001 + cloudOffset * 0.01;
    vec3 detailCoord = position * detailScale * 0.001 + detailOffset * 0.01;
    vec4 texel = texture(mainTex, texCoord);
    vec4 detailTexel = texture(detailTex, detailCoord);
    return max(0.0, (texel.r*mainWeight + detailTexel.r*detailWeight) - densityThreshold) * densityMultiplier;
}

float box(vec3 position, vec3 center, vec3 size) {
  vec3 q = abs(position - center) - size;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y,q.z)), 0.0);
}

float lightmarch(vec3 position) {
    float dstInsideBox = rayBoxDst(minBounds, maxBounds, position, 1.0/lightDir).y;

    float stepSize = dstInsideBox/float(numStepsLight);
    float totalDensity = 0.0;

    for (int step = 0; step < numStepsLight; step++) {
        position += lightDir * stepSize;
        totalDensity += max(0.0, sampleDensity(position) * stepSize);
    }

    float transmittance = exp(-totalDensity * lightAbsortionToSource);
    return darknessThreshold + transmittance * (1.0-darknessThreshold);
}

vec4 raymarch(vec3 eye, vec3 viewRayDirection) {
    vec2 rayBoxInfo = rayBoxDst(minBounds, maxBounds, eye, viewRayDirection);
    float dstToBox = rayBoxInfo.x;
    float dstInsideBox = rayBoxInfo.y;

    float dstTravelled = 0.0;
    float stepSize = dstInsideBox / float(marchingSteps);
    float dstLimit = dstInsideBox;

    float transmittance = 1.0;
    float lightEnergy = 0.0;
    float density = 0.0;
    while (dstTravelled < dstLimit) {
        vec3 rayPos = eye + viewRayDirection * (dstToBox + dstTravelled);
        density += sampleDensity(rayPos) * stepSize;

        if (density > 0.0) {
            float lightTransmittance = lightmarch(rayPos);
            lightEnergy += density * stepSize * transmittance * lightTransmittance * phaseVal;
            transmittance *= exp(-density * stepSize * lightAbsortionThroughCloud);

            if (transmittance < 0.01)
                break;
        }
        dstTravelled += stepSize;
    }

    vec3 cloudCol = lightEnergy * lightColor;
    vec3 col = vec3(0.0) * transmittance + cloudCol;
    return vec4(col, 1.0);
}

mat4 virtualViewMatrix(vec3 eye, vec3 center, vec3 up) {
    // Based on gluLookAt man page
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
    mat4 transformation = virtualViewMatrix(cameraPos, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    cameraDir = (transformation * vec4(cameraDir, 0.0)).xyz;

    vec4 col = raymarch(cameraPos, cameraDir);
    gl_FragColor = col;
}