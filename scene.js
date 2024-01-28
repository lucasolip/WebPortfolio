import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"

import { OrbitControls } from "/three/OrbitControls.js"
import * as TWEEN from '/tween.esm.js'
import { loadSkybox, loadObjects, leavesMaterial, waterMaterial } from "/LoadObjects.js"
import mobile from '/SystemCheck.js'

const backgroundColor = 0x9fd9f5;
let pixelRatio = window.devicePixelRatio;

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(pixelRatio);
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const ambientLight = new THREE.AmbientLight(backgroundColor, 0.4);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
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
if (renderer.domElement.style.touchAction === 'none')
    renderer.domElement.style.touchAction = 'pan-y';

let width = window.innerWidth, height = window.innerHeight;

function updateWindowSize() {
    if (window.innerWidth !== width || window.innerHeight !== height) {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    if (isPaused) render(0);
}

let isPaused = false;
let previousTime = 0;

function adaptPixelRatio(time) {
    let fps = 1000 / (time - previousTime);
    previousTime = time;
    if (fps < 25 && pixelRatio === window.devicePixelRatio) {
        pixelRatio = 1;
        renderer.setPixelRatio(pixelRatio);
    } else if (fps >= 30 && window.devicePixelRatio > 1 && pixelRatio === 1) {
        pixelRatio = window.devicePixelRatio;
        renderer.setPixelRatio(pixelRatio);
    }
}

function render(time) {
    adaptPixelRatio(time);

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

function animate(time) {
    if (!isPaused) {
        requestAnimationFrame(animate);
        render(time);
    }
}

onresize = updateWindowSize;

let pauseButton = document.getElementById("pauseButton");
pauseButton.onclick = function () {
    isPaused = !isPaused;
    if (isPaused) {
        pauseButton.lastElementChild.src = "./media/images/play.svg"
    } else {
        pauseButton.lastElementChild.src = "./media/images/pause.svg"
        animate();
    }
};

animate();
