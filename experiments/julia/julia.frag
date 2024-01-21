precision highp float;

uniform vec2 resolution;
uniform sampler2D texture;
uniform vec2 offset;
uniform vec2 time;
uniform vec2 zoom;
uniform vec2 c;

const vec2 origin = vec2(0.0, 0.0);
const float maxIter = 512.0;

vec2 computeIteration(vec2 p) {
  return vec2(p.x*p.x - p.y*p.y, 2.0*p.x*p.y) + c;
}

vec3 hsvToRgb(vec3 hsv) {
    float h = mod(hsv.x, 360.0);
    float s = clamp(hsv.y, 0.0, 1.0);
    float v = clamp(hsv.z, 0.0, 1.0);
    
    if (s == 0.0) {
        return vec3(v, v, v);
    }
    
    float hi = floor(h / 60.0);
    float f = h / 60.0 - hi;
    float p = v * (1.0 - s);
    float q = v * (1.0 - s * f);
    float t = v * (1.0 - s * (1.0 - f));
    vec3 result;
    
    if (int(hi) == 0) {
      return vec3(v, t, p);
    }
    if (int(hi) == 1) {
      return vec3(q, v, p);
    }
    if (int(hi) == 2) {
      return vec3(p, v, t);
    }
    if (int(hi) == 3) {
      return vec3(p, q, v);
    }
    if (int(hi) == 4) {
      return vec3(t, p, v);
    }
    return vec3(v, p, q);
}

float computeFragment(vec2 p) {
  vec2 newP = computeIteration(p);
  for (float i = 0.0; i < maxIter; i += 1.0) {
    newP = computeIteration(newP);
    if (distance(newP, origin) > 2.0) {
      return i;
    }
  }
  return maxIter;
}

void main() {
    vec2 fragment = gl_FragCoord.xy/resolution;
    vec2 p = (fragment * 2.0 - 1.0) * zoom + offset;
    
    float steps = computeFragment(p);
    float color = steps/maxIter;
    
    gl_FragColor = vec4(hsvToRgb(vec3(color * 360.0, 0.75, 0.25+float(steps<maxIter))), 1.0);
}