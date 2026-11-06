/**
 * Image tiles inside the menu bulge under the cursor.
 * Small WebGL texture pass: the further the pointer is from the centre,
 * the closer the sampled uv stays to its source (a soft lens).
 */

const VERTEX = `
attribute vec2 a_position;
uniform vec2 uTextureResolution;
uniform vec2 uResolution;
varying vec2 vUv;

vec2 resizeUvCover(vec2 uv, vec2 size, vec2 resolution) {
  vec2 ratio = vec2(
    min((resolution.x / resolution.y) / (size.x / size.y), 1.0),
    min((resolution.y / resolution.x) / (size.y / size.x), 1.0)
  );
  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  vUv = resizeUvCover(a_position * 0.5 + 0.5, uTextureResolution, uResolution);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uMouse;
uniform float uStrength;

varying vec2 vUv;

vec2 bulge(vec2 uv, vec2 center, float strength) {
  vec2 dir = uv - center;
  float dist = length(dir);
  float falloff = 1.0 / (1.0 + dist * dist * 8.0);
  return uv - dir * strength * falloff;
}

void main() {
  vec2 uv = bulge(vUv, uMouse, uStrength);
  gl_FragColor = texture2D(uTexture, uv);
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

export function createBulge(container, src) {
  const canvas = document.createElement("canvas");
  container.append(canvas);

  const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
  if (!gl) return;

  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
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

  const uTexture = gl.getUniformLocation(program, "uTexture");
  const uMouse = gl.getUniformLocation(program, "uMouse");
  const uResolution = gl.getUniformLocation(program, "uResolution");
  const uTextureResolution = gl.getUniformLocation(program, "uTextureResolution");
  const uStrength = gl.getUniformLocation(program, "uStrength");

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const image = new Image();
  image.src = src;
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform2f(uTextureResolution, image.width, image.height);
  };

  let targetX = 0.5;
  let targetY = 0.5;
  let currentX = 0.5;
  let currentY = 0.5;
  let hovering = false;
  let alpha = 0;
  let strength = 0;

  const resize = () => {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, rect.width, rect.height);
    }
  };

  const onMouseMove = (event) => {
    const rect = container.getBoundingClientRect();
    hovering =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (hovering) {
      targetX = (event.clientX - rect.left) / rect.width;
      targetY = 1 - (event.clientY - rect.top) / rect.height;
    }
  };

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMouseMove);
  resize();

  let rafId = 0;
  const render = () => {
    rafId = requestAnimationFrame(render);

    currentX += (targetX - currentX) * 0.1;
    currentY += (targetY - currentY) * 0.1;

    const target = hovering ? 1 : 0;
    const ease = hovering ? 0.06 : 0.12;
    alpha += (target - alpha) * ease;
    strength += (alpha - strength) * 0.08;

    gl.uniform2f(uMouse, currentX, currentY);
    gl.uniform1f(uStrength, strength * 0.25);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  render();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMouseMove);
  };
}
