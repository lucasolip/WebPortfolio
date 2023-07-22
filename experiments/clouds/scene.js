import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"

import { OrbitControls } from "../../three/OrbitControls.js"
import { GUI } from "../../three/GUI.js"
import { MathUtils } from "../../three/MathUtils.js"

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
const camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, -1, 100);
const backgroundColor = 0x9fd9f5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = "navCanvas";
renderer.setClearColor(backgroundColor, 1);

document.body.appendChild(renderer.domElement);

// Camera controls

const virtualCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(virtualCamera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true;
controls.enablePan = false;
//controls.autoRotate = true;
controls.target.set(0, 0, 0);

//controls.update() must be called after any manual changes to the camera's transform
virtualCamera.position.set(8, 8, 18);
controls.update();

// GUI and shader properties

var properties = {
  slice: 0.5,
  visualizationSize: 0,
  cloudScale: 100.0,
  detailScale: 100.0,
  cloudOffset: 0.0,
  detailOffset: 0.0,
  detailWeight: 0.2,
  mainWeight: 0.8,
  cloudSpeed: 0.05,
  detailSpeed: 0.1,
  densityThreshold: 0.75,
  densityMultiplier: 15.0,
  marchingSteps: 32,
  cloudSize: new THREE.Vector3(10.0, 2.0, 10.0),
  numStepsLight: 8,
  darknessThreshold: 0.0,
  lightAbsortionThroughCloud: 0.5,
  lightAbsortionToSource: 1.0,
  phaseVal: 0.5,
  lightColor: '#ffffff',
  backgroundColor: backgroundColor
};

function mod(n, m) {
  return ((n % m) + m) % m;
}

function generateTexture(size, subBlockSize, invert) {
  const subBlockCount = size / subBlockSize;
  const points = [];

  for (let k = 0; k < subBlockCount; k++) {
    for (let j = 0; j < subBlockCount; j++) {
      for (let i = 0; i < subBlockCount; i++) {
        points.push(new THREE.Vector3(
          MathUtils.randFloat(i * subBlockSize, (i + 1) * subBlockSize),
          MathUtils.randFloat(j * subBlockSize, (j + 1) * subBlockSize),
          MathUtils.randFloat(k * subBlockSize, (k + 1) * subBlockSize)));
      }
    }
  }
  const data = new Uint8Array(size * size * size * 4); // 4 components (RGBA) per texel

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const currentPosition = new THREE.Vector3(x, y, z);
        const xIndex = Math.floor(x / subBlockSize);
        const yIndex = Math.floor(y / subBlockSize);
        const zIndex = Math.floor(z / subBlockSize);

        let distance = size;
        for (let subZ = -1; subZ < 2; subZ++) {
          for (let subY = -1; subY < 2; subY++) {
            for (let subX = -1; subX < 2; subX++) {
              const subBlockPointIndex =
                mod(xIndex + subX, subBlockCount) +
                mod(yIndex + subY, subBlockCount) * subBlockCount +
                mod(zIndex + subZ, subBlockCount) * subBlockCount * subBlockCount;
              let currentBlockPoint = points[subBlockPointIndex].clone();

              if ((subX === -1 && xIndex === 0) || (subX === 1 && xIndex === subBlockCount - 1)) {
                currentBlockPoint.x += subX * size;
              }

              if ((subY === -1 && yIndex === 0) || (subY === 1 && yIndex === subBlockCount - 1)) {
                currentBlockPoint.y += subY * size;
              }

              if ((subZ === -1 && zIndex === 0) || (subZ === 1 && zIndex === subBlockCount - 1)) {
                currentBlockPoint.z += subZ * size;
              }

              let currentDistance = currentPosition.distanceTo(currentBlockPoint);

              if (currentDistance < distance) {
                distance = currentDistance;
              }
            }
          }
        }

        const index = (x + y * size + z * size * size) * 4;
        let intensity = (distance / (subBlockSize * 3.0));
        if (invert) intensity = -intensity + 1.0;
        data[index] = Math.floor(intensity * 255); // Red component
        data[index + 1] = 0.0; // Green component
        data[index + 2] = 0.0; // Blue component
        data[index + 3] = 255; // Alpha component
      }
    }
  }

  const texture3D = new THREE.Data3DTexture(data, size, size, size);
  texture3D.format = THREE.RGBAFormat; // RGBA format
  texture3D.type = THREE.UnsignedByteType; // Unsigned byte type (0 to 255 values)

  texture3D.magFilter = THREE.LinearFilter;
  texture3D.minFilter = THREE.LinearFilter;
  texture3D.wrapS = THREE.RepeatWrapping;
  texture3D.wrapT = THREE.RepeatWrapping;
  texture3D.wrapR = THREE.RepeatWrapping;
  texture3D.needsUpdate = true;
  return texture3D;
}

// Create a material and mesh
loadFile('3DTextureViewer.frag', (fragShader) => {
  loadFile('3DTextureViewer.vert', (vertShader) => {
    const texture3D = generateTexture(128, 64, true);
    const detailTexture3D = generateTexture(64, 8, true);
    let size = new THREE.Vector2(properties.visualizationSize / window.innerWidth, properties.visualizationSize / window.innerHeight);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      uniforms: {
        size: { value: size },
        mainTex: { value: texture3D },
        detailTex: { value: detailTexture3D },
        slice: { value: properties.slice },
        scale: { value: 2.0 }
      }
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let speed = new THREE.Vector3(properties.cloudSpeed, properties.cloudSpeed, 0.0);
    let detailSpeed = new THREE.Vector3(properties.detailSpeed, -properties.detailSpeed, 0.0);
    loadFile('Clouds.frag', (cubeFragShader) => {
      const planeMaterial = new THREE.ShaderMaterial({
        fragmentShader: cubeFragShader,
        uniforms: {
          mainTex: { value: texture3D },
          detailTex: { value: detailTexture3D },
          resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          fov: { value: virtualCamera.fov },
          cameraPos: { value: virtualCamera.position },
          cloudScale: { value: properties.cloudScale },
          detailScale: { value: properties.detailScale },
          mainWeight: { value: properties.mainWeight },
          detailWeight: { value: properties.detailWeight },
          cloudOffset: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
          detailOffset: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
          densityThreshold: { value: properties.densityThreshold },
          densityMultiplier: { value: properties.densityMultiplier },
          marchingSteps: { value: properties.marchingSteps },
          minBounds: { value: properties.cloudSize.clone().multiplyScalar(-0.5) },
          maxBounds: { value: properties.cloudSize.clone().multiplyScalar(0.5) },
          lightDir: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
          lightColor: { value: new THREE.Color(properties.lightColor) },
          backgroundColor: { value: new THREE.Color(properties.backgroundColor) },
          numStepsLight: { value: properties.numStepsLight },
          darknessThreshold: { value: properties.darknessThreshold },
          lightAbsortionThroughCloud: { value: properties.lightAbsortionThroughCloud },
          lightAbsortionToSource: { value: properties.lightAbsortionToSource },
          phaseVal: { value: properties.phaseVal }
        }
      });

      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
      planeMesh.position.z = -100;
      scene.add(planeMesh);

      // Simple GUI

      const gui = new GUI();

      const noiseFolder = gui.addFolder('Worley Noise');
      noiseFolder.add(properties, 'slice', 0, 1).onChange(function (value) {
        material.uniforms.slice.value = properties.slice;
      });
      noiseFolder.add(properties, 'visualizationSize', 0, 512).onChange(function (value) {
        material.uniforms.size.value =
          new THREE.Vector2(properties.visualizationSize / window.innerWidth, properties.visualizationSize / window.innerHeight);
      });
      noiseFolder.open();
      const cloudsFolder = gui.addFolder('Clouds');
      cloudsFolder.add(properties, 'cloudScale', 0, 100).onChange(function (value) {
        planeMaterial.uniforms.cloudScale.value = properties.cloudScale;
      });
      cloudsFolder.add(properties, 'detailScale', 50, 250).onChange(function (value) {
        planeMaterial.uniforms.detailScale.value = properties.detailScale;
      });
      cloudsFolder.add(properties, 'mainWeight', 0, 1).onChange(function (value) {
        planeMaterial.uniforms.mainWeight.value = properties.mainWeight;
      });
      cloudsFolder.add(properties, 'detailWeight', 0, 1).onChange(function (value) {
        planeMaterial.uniforms.detailWeight.value = properties.detailWeight;
      });
      cloudsFolder.add(properties, 'cloudSpeed', -1, 1).onChange(function (value) {
        speed = new THREE.Vector3(properties.cloudSpeed, 0.0, properties.cloudSpeed);
      });
      cloudsFolder.add(properties, 'detailSpeed', -1, 1).onChange(function (value) {
        detailSpeed = new THREE.Vector3(properties.detailSpeed, 0.0, -properties.detailSpeed);
      });
      cloudsFolder.add(properties, 'densityThreshold', 0, 1).onChange(function (value) {
        planeMaterial.uniforms.densityThreshold.value = properties.densityThreshold;
      });
      cloudsFolder.add(properties, 'densityMultiplier', 0, 100).onChange(function (value) {
        planeMaterial.uniforms.densityMultiplier.value = properties.densityMultiplier;
      });
      cloudsFolder.add(properties, 'marchingSteps', 1, 128).onChange(function (value) {
        planeMaterial.uniforms.marchingSteps.value = properties.marchingSteps;
      });
      cloudsFolder.open();
      const cloudSizeFolder = gui.addFolder('Clouds size');
      cloudSizeFolder.add(properties.cloudSize, 'x', 0, 50).onChange(function (value) {
        planeMaterial.uniforms.minBounds.value = properties.cloudSize.clone().multiplyScalar(-0.5);
        planeMaterial.uniforms.maxBounds.value = properties.cloudSize.clone().multiplyScalar(0.5);
      });
      cloudSizeFolder.add(properties.cloudSize, 'y', 0, 50).onChange(function (value) {
        planeMaterial.uniforms.minBounds.value = properties.cloudSize.clone().multiplyScalar(-0.5);
        planeMaterial.uniforms.maxBounds.value = properties.cloudSize.clone().multiplyScalar(0.5);
      });
      cloudSizeFolder.add(properties.cloudSize, 'z', 0, 50).onChange(function (value) {
        planeMaterial.uniforms.minBounds.value = properties.cloudSize.clone().multiplyScalar(-0.5);
        planeMaterial.uniforms.maxBounds.value = properties.cloudSize.clone().multiplyScalar(0.5);
      });
      cloudSizeFolder.open();
      const lightingFolder = gui.addFolder('Lighting');
      lightingFolder.add(properties, 'numStepsLight', 0, 16).onChange(function (value) {
        planeMaterial.uniforms.numStepsLight.value = properties.numStepsLight;
      });
      lightingFolder.add(properties, 'darknessThreshold', 0, 1).onChange(function (value) {
        planeMaterial.uniforms.darknessThreshold.value = properties.darknessThreshold;
      });
      lightingFolder.add(properties, 'lightAbsortionThroughCloud', 0, 1).name("Cloud absortion").onChange(function (value) {
        planeMaterial.uniforms.lightAbsortionThroughCloud.value = properties.lightAbsortionThroughCloud;
      });
      lightingFolder.add(properties, 'lightAbsortionToSource', 0, 1).name("Light absortion").onChange(function (value) {
        planeMaterial.uniforms.lightAbsortionToSource.value = properties.lightAbsortionToSource;
      });
      lightingFolder.addColor(properties, 'lightColor').name("Color").onChange(function (value) {
        planeMaterial.uniforms.lightColor.value = new THREE.Color(properties.lightColor);
      });
      lightingFolder.addColor(properties, 'backgroundColor').name("Background Color").onChange(function (value) {
        planeMaterial.uniforms.backgroundColor.value = new THREE.Color(properties.backgroundColor);
      });
      lightingFolder.open();


      document.getElementsByClassName("ac")[0].style.zIndex = 100

      // On window resize

      let width = window.innerWidth, height = window.innerHeight;
      function updateWindowSize() {
        if (window.innerWidth !== width || window.innerHeight !== height) {
          width = window.innerWidth;
          height = window.innerHeight;
          virtualCamera.aspect = window.innerWidth / window.innerHeight;
          virtualCamera.updateProjectionMatrix();
          material.uniforms.size.value = new THREE.Vector2(properties.visualizationSize / window.innerWidth, properties.visualizationSize / window.innerHeight);
          planeMaterial.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);

          renderer.setSize(window.innerWidth, window.innerHeight);
        }
      }

      // Main loop
      // let prevDelta = 0.0;
      function animate(delta) {
        // const deltaTime = 1.0 / (delta - prevDelta);
        // prevDelta = delta;
        planeMaterial.uniforms.cloudOffset.value.add(speed);
        planeMaterial.uniforms.detailOffset.value.add(detailSpeed);

        controls.update();
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();

      onresize = updateWindowSize;
    });
  });
});