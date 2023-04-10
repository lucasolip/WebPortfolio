import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"
import { OBJLoader } from "./OBJLoader.js"
import { OrbitControls } from "./OrbitControls.js"

var objLoader = new OBJLoader();
function loadObject(path, material) {
    objLoader.load(path, function (object) {
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = material;
            }
        });
        scene.add(object);
    });
}

var backgroundColor = 0x56caf5;

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = "navCanvas";
renderer.setClearColor(backgroundColor, 1);
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

var ambientLight = new THREE.AmbientLight(backgroundColor, 0.4);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 1, -1);
scene.add(directionalLight);

var islandMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/IslandColor.png'),
    normalMap: new THREE.TextureLoader().load('media/textures/IslandNormal.png')
});

var trunkMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/TrunkColor.png'),
    normalMap: new THREE.TextureLoader().load('media/textures/TrunkNormal.png'),
    roughnessMap: new THREE.TextureLoader().load('media/textures/TrunkRoughness.png')
});

var leavesMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('media/textures/LeavesColor.png'),
    normalMap: new THREE.TextureLoader().load('media/textures/LeavesNormal.png'),
    alphaTest: 0.5,
    side: THREE.DoubleSide
});

var waterMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('media/textures/WaterColor.png'),
    normalMap: new THREE.TextureLoader().load('media/textures/WaterNormal.png'),
    side: THREE.DoubleSide,
    specular: 0xffffff,
    shininess: 100
});

var rockMaterial = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('media/textures/RockColor.jpg'),
    normalMap: new THREE.TextureLoader().load('media/textures/RockNormal.png'),
});

loadObject('media/objects/island.obj', islandMaterial);
loadObject('media/objects/trunk.obj', trunkMaterial);
loadObject('media/objects/leaves.obj', leavesMaterial);
loadObject('media/objects/water.obj', waterMaterial);
loadObject('media/objects/rock1.obj', rockMaterial);
loadObject('media/objects/rock2.obj', rockMaterial);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;

controls.touches = {
    TWO: THREE.TOUCH.ROTATE
}

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 2, -6);
controls.update();

function updateWindowSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    updateWindowSize();
    controls.update();

    renderer.render(scene, camera);
}
animate();