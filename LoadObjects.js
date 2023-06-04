import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.150.1/three.module.min.js"
import { OBJLoader } from "./three/OBJLoader.js"
import { RGBELoader } from "./three/RGBELoader.js"
import simplex2D from "./shaders/simplex2D.glsl.js"
import * as TWEEN from './tween.esm.js'
import mobile from './SystemCheck.js'

const loadingManager = new THREE.LoadingManager();

const loadMaterials = function () {
    islandMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('media/textures/IslandColor.jpg'),
        normalMap: textureLoader.load('media/textures/IslandNormalCompressed.png')
    });

    trunkMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('media/textures/TrunkColor.jpg'),
        normalMap: textureLoader.load('media/textures/TrunkNormalCompressed.png'),
        roughnessMap: textureLoader.load('media/textures/TrunkRoughnessCompressed.png')
    });

    leavesMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('media/textures/LeavesColorCompressed.png'),
        normalMap: textureLoader.load('media/textures/LeavesNormalCompressed.png'),
        alphaTest: 0.9,
        side: THREE.DoubleSide,
        roughness: 0.5
    });
    leavesMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 1.0 };
        shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `
        ${simplex2D}
        void main() {`
        );
        shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
        vec3 transformed = vec3(position);
        float displacementAmount = 0.08;
        float noiseScale = 3.0;
        transformed.x += displacementAmount*snoise(vec2(noiseScale*position.x, time));
        transformed.z += displacementAmount*snoise(vec2(noiseScale*position.z, time) + vec2(128.0));`
        );
        leavesMaterial.userData.shader = shader;
    };

    waterMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('media/textures/WaterColor.jpg', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        normalMap: textureLoader.load('media/textures/WaterNormalCompressed.png', function (texture) {
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
        gl_FragColor = vec4(gl_FragColor.xyz, gl_FragColor.a * alpha);`
        );
        waterMaterial.userData.shader = shader;
    };

    rockMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('media/textures/RockColor.jpg'),
        normalMap: textureLoader.load('media/textures/RockNormalCompressed.png')
    });
}

const loadMaterialsMobile = function () {
    islandMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('media/textures/IslandColor.jpg'),
        normalMap: textureLoader.load('media/textures/IslandNormalCompressed.png')
    });

    trunkMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('media/textures/TrunkColor.jpg'),
        normalMap: textureLoader.load('media/textures/TrunkNormalCompressed.png')
    });

    leavesMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('media/textures/LeavesColorCompressed.png'),
        normalMap: textureLoader.load('media/textures/LeavesNormalCompressed.png'),
        alphaTest: 0.9,
        side: THREE.DoubleSide
    });
    leavesMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 1.0 };
        shader.vertexShader = "uniform float time;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `
        ${simplex2D}
        void main() {`
        );
        shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
        vec3 transformed = vec3(position);
        float displacementAmount = 0.08;
        float noiseScale = 3.0;
        transformed.x += displacementAmount*snoise(vec2(noiseScale*position.x, time));
        transformed.z += displacementAmount*snoise(vec2(noiseScale*position.z, time) + vec2(128.0));`
        );
        leavesMaterial.userData.shader = shader;
    };

    waterMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('media/textures/WaterColor.jpg', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        normalMap: textureLoader.load('media/textures/WaterNormalCompressed.png', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        side: THREE.DoubleSide,
        shininess: 100,
        specular: { value: [1, 1, 1] }
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
        gl_FragColor = vec4(gl_FragColor.xyz, gl_FragColor.a * alpha);`
        );
        waterMaterial.userData.shader = shader;
    };

    rockMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('media/textures/RockColor.jpg'),
        normalMap: textureLoader.load('media/textures/RockNormalCompressed.png')
    });
}

const loadSkybox = function (renderer, scene) {
    var pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new RGBELoader()
        .load('./media/textures/wasteland_clouds_puresky_1k.hdr', function (texture) {
            var envMap = pmremGenerator.fromEquirectangular(texture).texture;

            scene.background = envMap;
            scene.environment = envMap;

            texture.dispose();
            pmremGenerator.dispose();
        });
}

const objLoader = new OBJLoader(loadingManager);
const textureLoader = new THREE.TextureLoader(loadingManager);
const loadObjects = function (renderer, scene) {
    function loadObject(path, material, shadow, transparent) {
        objLoader.load(path, function (object) {
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = shadow;
                    child.receiveShadow = shadow;
                    child.material = material;
                    material.transparent = true;
                    material.opacity = 0;
                    child.transparentObject = transparent;
                }
            });
            scene.add(object);
        });
    }
    loadingManager.onLoad = function () {
        const opacityAnimation = new TWEEN.Tween({ opacity: 0 })
            .to({ opacity: 1 }, 1000)
            .onUpdate(() => {
                scene.children.forEach(object => {
                    object.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {
                            child.material.opacity = opacityAnimation._object.opacity;
                            if (opacityAnimation._object.opacity == 1 && !child.transparentObject) {
                                child.material.transparent = false;
                            }
                        }
                    })
                })
            })
            .start();
    };

    if (mobile)
        loadMaterialsMobile();
    else
        loadMaterials();

    loadObject('media/objects/island.obj', islandMaterial, true, false);
    loadObject('media/objects/trunk.obj', trunkMaterial, true, false);
    loadObject('media/objects/leaves.obj', leavesMaterial, true, true);
    loadObject('media/objects/water.obj', waterMaterial, false, true);
    loadObject('media/objects/rock1.obj', rockMaterial, true, false);
    loadObject('media/objects/rock2.obj', rockMaterial, true, false);
}

var islandMaterial = null;
var trunkMaterial = null;
var leavesMaterial = null;
var rockMaterial = null;
var waterMaterial = null;
var leavesMaterial = null;

export { loadSkybox, loadObjects, leavesMaterial, waterMaterial };