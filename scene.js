import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"

import { OrbitControls } from "./three/OrbitControls.js"
import * as TWEEN from './tween.esm.js'
import { loadSkybox, loadObjects, leavesMaterial, waterMaterial } from "./LoadObjects.js"
import mobile from './SystemCheck.js'

var backgroundColor = 0x56caf5;
console.log(mobile);

var renderer = new THREE.WebGLRenderer();
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = "navCanvas";
renderer.setClearColor(backgroundColor, 1);

if (!mobile) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
}

document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

var ambientLight = new THREE.AmbientLight(backgroundColor, 0.4);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
if (mobile)
    directionalLight.position.set(1, 1, -0.5);
else {
    directionalLight.position.set(1, 1, 0.5);
    directionalLight.castShadow = true;
    loadSkybox(renderer, scene);
}
scene.add(directionalLight);

loadObjects(renderer, scene);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
//controls.autoRotate = true;
controls.target.set(0, 0.5, 0);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(-3, 1.5, -6);
controls.update();
renderer.domElement.style.touchAction = 'pan-down';

var width = window.innerWidth, height = window.innerHeight;

function updateWindowSize() {
    if (window.innerWidth !== width || window.innerHeight !== height) {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function animate(time) {
    requestAnimationFrame(animate);

    controls.update();

    TWEEN.update(time);
    if (waterMaterial !== null && leavesMaterial !== null) {
        const waterShader = waterMaterial.userData.shader;
        const leavesShader = leavesMaterial.userData.shader;
        if (waterShader)
            waterShader.uniforms.time.value = performance.now() / 5000.0;
        if (leavesShader)
            leavesShader.uniforms.time.value = performance.now() / 1000.0;
    }

    renderer.render(scene, camera);
}

onresize = updateWindowSize;

animate();
