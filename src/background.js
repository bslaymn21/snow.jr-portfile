/**
 * Animated glyph-grid background used behind the fullscreen menu.
 * Shader reproduced from the reference site (65-cell grid, warm palette,
 * noise density field with a mouse "clearing" and directional stretch).
 */

const VERTEX = `
attribute vec2 a_position;
varying vec2 vUv;
void main() {
  vUv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec2  uDrift;
uniform float uScroll;
uniform float uPhase1;
uniform float uPhase2;
uniform float uPhase3;
uniform float uGridSize;
uniform vec3  uBg0;
uniform vec3  uFg0;
uniform vec3  uBg1;
uniform vec3  uFg1;
uniform vec3  uBg2;
uniform vec3  uFg2;
uniform vec3  uBg3;
uniform vec3  uFg3;
uniform vec2  uMouse;
uniform vec2  uMouseVel;

float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += noise(p) * a;
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

float dotShape(vec2 uv, float s) {
    return 1.0 - smoothstep(s, s + 0.008, length(uv));
}

float lineShape(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return 1.0 - smoothstep(w, w + 0.008, length(pa - ba * h));
}

void main() {
    vec2 uv = vUv;
    uv.x *= uAspect;

    vec2 p = uv * 2.0;
    p += uDrift;

    float scrollFlow = uScroll * 0.9;

    vec2 q = vec2(
        fbm(p + vec2(0.00, 0.00) + uTime * 0.3 + scrollFlow),
        fbm(p + vec2(5.20, 1.30) + uTime * 0.25 + scrollFlow * 0.8)
    );

    float density = fbm(p + 2.5 * q + scrollFlow * 0.15);
    density = smoothstep(0.2, 0.8, density);

    vec2  toMouse = uv - uMouse;
    float speed   = length(uMouseVel);
    vec2  dir     = speed > 0.0008 ? uMouseVel / speed : vec2(1.0, 0.0);
    vec2  perp    = vec2(-dir.y, dir.x);

    float alongDir  = dot(toMouse, dir);
    float alongPerp = dot(toMouse, perp);

    float stretch = min(1.0 + speed * 26.0, 6.0);

    float edgeNoise = (fbm(uv * 5.0 + uMouse * 3.0 + uTime * 0.12) - 0.5) * 0.16
                    + (fbm(uv * 9.0 - uMouse * 2.0 + uTime * 0.22) - 0.5) * 0.08;

    float mouseDist = length(vec2(alongDir / stretch, alongPerp)) + edgeNoise;
    float clearing  = smoothstep(0.02, 0.16, mouseDist);
    density *= clearing;

    vec2 gv  = fract(uv * uGridSize) - 0.5;
    vec2 sgv = gv * 1.3;

    float dotR = mix(0.052, 0.065, smoothstep(0.0, 0.55, density));
    float dot  = dotShape(sgv, dotR);

    float t      = smoothstep(0.22, 0.85, density);
    float armLen = mix(0.030, 0.26, t);
    float armW   = mix(0.010, 0.030, t);

    float l1   = lineShape(sgv, vec2(-armLen), vec2(armLen), armW);
    float l2   = lineShape(sgv * vec2(-1.0, 1.0), vec2(-armLen), vec2(armLen), armW);
    float arms = max(l1, l2);

    float cardFade = clamp(smoothstep(0.64, 0.88, density), 0.0, 1.0);
    float cr  = 0.192;
    float cds = 0.048;
    float cd  = max(
        max(dotShape(sgv - vec2( 0.0,  cr), cds),
            dotShape(sgv - vec2( 0.0, -cr), cds)),
        max(dotShape(sgv - vec2( cr,  0.0), cds),
            dotShape(sgv - vec2(-cr,  0.0), cds))
    ) * cardFade;

    float glyph = max(dot, max(arms, cd));

    vec3 bg = mix(mix(mix(uBg0, uBg1, uPhase1), uBg2, uPhase2), uBg3, uPhase3);
    vec3 fg = mix(mix(mix(uFg0, uFg1, uPhase1), uFg2, uPhase2), uFg3, uPhase3);

    gl_FragColor = vec4(mix(bg, fg, glyph), 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createGridBackground(canvas) {
  if (!canvas) return { destroy() {} };

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return { destroy() {} };

  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertexShader || !fragmentShader) return { destroy() {} };

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return { destroy() {} };
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  [
    "uTime",
    "uAspect",
    "uDrift",
    "uScroll",
    "uPhase1",
    "uPhase2",
    "uPhase3",
    "uGridSize",
    "uBg0",
    "uFg0",
    "uBg1",
    "uFg1",
    "uBg2",
    "uFg2",
    "uBg3",
    "uFg3",
    "uMouse",
    "uMouseVel",
  ].forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });

  let aspect = 1;
  const resize = () => {
    const width = window.innerWidth;
    const height = Math.max(
      window.innerHeight,
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--app-height")
      ) || 0
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, width, height);
      aspect = width / height;
    }
  };

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  let targetX = isMobile ? -10 : 0.9;
  let targetY = isMobile ? -10 : 0.9;
  let mouseX = targetX;
  let mouseY = targetY;
  let velX = 0;
  let velY = 0;
  let prevX = targetX;
  let prevY = targetY;

  const onMouseMove = (event) => {
    targetX = event.clientX / window.innerWidth;
    targetY = 1 - event.clientY / window.innerHeight;
  };
  const onScroll = () => {
    scrollProgress = window.scrollY / window.innerHeight;
  };

  let scrollProgress = 0;
  if (!isMobile) window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", resize);

  resize();
  gl.uniform1f(uniforms.uAspect, aspect);
  gl.uniform1f(uniforms.uGridSize, 65);

  const palette = [
    [1, 0.78, 0.706],
    [0.8, 0.51, 0.29],
  ];

  for (let i = 0; i < 4; i += 1) {
    gl.uniform3f(uniforms[`uBg${i}`], ...palette[0]);
    gl.uniform3f(uniforms[`uFg${i}`], ...palette[1]);
  }
  gl.uniform1f(uniforms.uPhase1, 0);
  gl.uniform1f(uniforms.uPhase2, 0);
  gl.uniform1f(uniforms.uPhase3, 0);
  gl.clearColor(1, 0.818, 0.818, 1);

  const started = performance.now();
  let rafId = 0;

  const render = () => {
    rafId = requestAnimationFrame(render);
    if (document.hidden) return;

    const time = (performance.now() - started) * 0.001;

    mouseX += (targetX - mouseX) * 0.065;
    mouseY += (targetY - mouseY) * 0.065;

    const dx = (mouseX - prevX) * aspect;
    const dy = mouseY - prevY;
    prevX = mouseX;
    prevY = mouseY;

    velX += (dx - velX) * 0.15;
    velY += (dy - velY) * 0.15;

    const driftX = Math.sin(time * 0.09) * 0.85 + Math.sin(time * 0.13) * 0.35;
    const driftY = Math.cos(time * 0.07) * 0.7 + Math.cos(time * 0.11) * 0.28;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform2f(uniforms.uDrift, driftX, driftY);
    gl.uniform2f(uniforms.uMouse, mouseX * aspect, mouseY);
    gl.uniform2f(uniforms.uMouseVel, velX, velY);
    gl.uniform1f(uniforms.uScroll, scrollProgress);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  render();

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
    },
  };
}
