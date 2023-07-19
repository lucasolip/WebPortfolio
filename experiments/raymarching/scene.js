import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"

import { OrbitControls } from "../../three/OrbitControls.js"
import { GUI } from "../../three/GUI.js"

function loadFile(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      callback(xhr.responseText);
    }
  };
  xhr.open('GET', url, true);
  xhr.send();
}

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
const backgroundColor = 0x9fd9f5;

const renderer = new THREE.WebGLRenderer();
//renderer.setPixelRatio(pixelRatio);
//renderer.toneMapping = THREE.ReinhardToneMapping;
//renderer.toneMappingExposure = 1.0;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = "navCanvas";
renderer.setClearColor(backgroundColor, 1);

document.body.appendChild(renderer.domElement);

// Virtual camera inside the shader

const virtualCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(virtualCamera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true;
controls.enablePan = false;
//controls.autoRotate = true;
controls.target.set(0, 0, 0);

//controls.update() must be called after any manual changes to the camera's transform
virtualCamera.position.set(0, 0, 5);
controls.update();

// GUI and shader properties

var properties = {
  fractalPower: 4.0,
  fractalIterations: 8,
  maxMarchingSteps: 64,
  phongShaded: false
};

// Create a material and mesh
loadFile('renderer.frag', function (file) {
  const material = new THREE.ShaderMaterial({
    fragmentShader: file,
    uniforms: {
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      fov: { value: virtualCamera.fov },
      cameraPos: { value: virtualCamera.position },
      cameraTarget: { value: controls.target },
      fractalPower: { value: properties.fractalPower },
      fractalIterations: { value: properties.fractalIterations },
      maxMarchingSteps: { value: properties.maxMarchingSteps },
      phongShaded: { value: properties.phongShaded }
    }
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Simple GUI

  const gui = new GUI();

  const raymarchingFolder = gui.addFolder('Ray Marching');
  raymarchingFolder.add(properties, 'maxMarchingSteps', 1, 128).onChange(function (value) {
    material.uniforms.maxMarchingSteps.value = properties.maxMarchingSteps;
  });
  raymarchingFolder.add(properties, 'phongShaded').onChange(function (value) {
    material.uniforms.phongShaded.value = properties.phongShaded;
  });
  raymarchingFolder.open();
  const fractalFolder = gui.addFolder('Fractal');
  fractalFolder.add(properties, 'fractalPower', 1.0, 10.0).onChange(function (value) {
    material.uniforms.fractalPower.value = properties.fractalPower;
  });
  fractalFolder.add(properties, 'fractalIterations', 2, 16).onChange(function (value) {
    material.uniforms.fractalIterations.value = properties.fractalIterations;
  });
  fractalFolder.open();
  document.getElementsByClassName("ac")[0].style.zIndex = 100

  // On window resize

  let width = window.innerWidth, height = window.innerHeight;
  function updateWindowSize() {
    if (window.innerWidth !== width || window.innerHeight !== height) {
      width = window.innerWidth;
      height = window.innerHeight;
      virtualCamera.aspect = window.innerWidth / window.innerHeight;
      virtualCamera.updateProjectionMatrix();
      material.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);

      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Main loop

  function animate() {
    controls.update();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  onresize = updateWindowSize;
});