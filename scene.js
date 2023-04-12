import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"
import { OBJLoader } from "./OBJLoader.js"
import { OrbitControls } from "./OrbitControls.js"
import * as TWEEN from './tween.esm.js'
import simplex3D from "./shaders/simplex3D.glsl.js"

const loadingManager = new THREE.LoadingManager();
var objLoader = new OBJLoader(loadingManager);
function loadObject(path, material, shadow) {
    objLoader.load(path, function (object) {
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.castShadow = shadow;
                child.receiveShadow = shadow;
                child.material = material;
                material.transparent = true;
                material.opacity = 0;
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

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.needsUpdate = true;

document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

var ambientLight = new THREE.AmbientLight(backgroundColor, 0.4);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(-1, 1, -0.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

loadingManager.onLoad = function () {
    console.log('All objects loaded.');

    const opacityAnimation = new TWEEN.Tween({ opacity: 0 })
        .to({ opacity: 1 }, 1000)
        .onUpdate(() => {
            scene.children.forEach(object => {
                object.traverse(function (child) {
                    if (child instanceof THREE.Mesh) {
                        child.material.opacity = opacityAnimation._object.opacity;
                    }
                })
            })
        })
        .start();

};

var islandMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/IslandColor.jpg'),
    normalMap: new THREE.TextureLoader().load('media/textures/IslandNormalCompressed.png')
});

var trunkMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/TrunkColor.jpg'),
    normalMap: new THREE.TextureLoader().load('media/textures/TrunkNormalCompressed.png'),
    roughnessMap: new THREE.TextureLoader().load('media/textures/TrunkRoughnessCompressed.png')
});

var leavesMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/LeavesColor.png'),
    normalMap: new THREE.TextureLoader().load('media/textures/LeavesNormal.png'),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.5
});
leavesMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 1.0 };
    shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        `
    ${simplex3D}
    void main() {`
    );
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
    vec3 transformed = vec3(position);
    float displacementAmount = 0.08;
    float noiseScale = 3.0;
    transformed.x += displacementAmount*snoise(vec3(noiseScale*position.x, noiseScale*position.z, time));
    transformed.z += displacementAmount*snoise(vec3(noiseScale*position.x, noiseScale*position.z, time) + vec3(128.0));`
    );
    leavesMaterial.userData.shader = shader;
};

var waterMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/WaterColor.png', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    normalMap: new THREE.TextureLoader().load('media/textures/WaterNormal.png', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    side: THREE.DoubleSide,
    roughness: 0.25
});
waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 1.0 };
    shader.vertexShader = "uniform float time;\nvarying float alpha;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
    alpha = smoothstep(0.1, 0.2, vUv.y);
    vUv.y += time;`
    );
    shader.fragmentShader = "varying float alpha;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
    gl_FragColor = vec4(gl_FragColor.xyz, alpha);`
    );
    waterMaterial.userData.shader = shader;
};

var rockMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('media/textures/RockColor.jpg'),
    normalMap: new THREE.TextureLoader().load('media/textures/RockNormal.png'),
});

loadObject('media/objects/island.obj', islandMaterial, true);
loadObject('media/objects/trunk.obj', trunkMaterial, true);
loadObject('media/objects/leaves.obj', leavesMaterial, true);
loadObject('media/objects/water.obj', waterMaterial, false);
loadObject('media/objects/rock1.obj', rockMaterial, true);
loadObject('media/objects/rock2.obj', rockMaterial, true);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
//controls.autoRotate = true;
controls.target.set(0, 0.5, 0);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(0, 2, -6);
controls.update();

function updateWindowSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);

    //directionalLight.position.set(Math.sin(time / 5000.0), Math.cos(time / 5000.0), 0.0);

    updateWindowSize();
    controls.update();

    TWEEN.update(time);
    const waterShader = waterMaterial.userData.shader;
    const leavesShader = leavesMaterial.userData.shader;
    if (waterShader)
        waterShader.uniforms.time.value = performance.now() / 5000.0;
    if (leavesShader)
        leavesShader.uniforms.time.value = performance.now() / 1000.0;

    renderer.render(scene, camera);
}
animate();