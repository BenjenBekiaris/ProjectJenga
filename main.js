import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from "three/addons";

var currentRotation = 0;

var restartButtonMesh;

var MAXLAYERS = 10;

var world;

var box = [];
const blockTexture = {
	textureAo : new THREE.TextureLoader().load( 'textures/block/marble_0017_ao_1k.jpg' ),
	textureNormal : new THREE.TextureLoader().load( 'textures/block/marble_0017_normal_opengl_1k.png' ),
	textureMap : new THREE.TextureLoader().load( 'textures/block/marble_0017_color_1k.jpg' ),
	textureRoughness : new THREE.TextureLoader().load( 'textures/block/marble_0017_roughness_1k.jpg' ),
}

for (const key in blockTexture) {
	blockTexture[key].wrapS = blockTexture[key].wrapT = THREE.RepeatWrapping;
}

var scene, renderer, camera, controls, timeButton;
var spotlights = [];

var cameraPlane;
var cameraPlaneVariables = [];

var player1 = {color: 0xffccff};
var player2 = {color: 0xccffff};

const raycaster = new THREE.Raycaster();
var cursor = {x: 0, y: 0};

var INTERSECTED_VISUAL, INTERSECTED_PHYSICAL ;
var HOLDING = false;


initThree();
initCannon();
addBoxes();
animate();

function initThree(){
	scene = new THREE.Scene();
	
	camera = new THREE.PerspectiveCamera( 100, window.innerWidth / window.innerHeight, 0.01, 1000 );
	camera.position.z = 15;
	camera.position.y = 4;

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize( window.innerWidth - 0.1, window.innerHeight - 0.1);

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const path = 'textures/MilkyWay/';
	const format = '.jpg';
	const urls = [
		path + 'dark-s_px' + format, path + 'dark-s_nx' + format,
		path + 'dark-s_py' + format, path + 'dark-s_ny' + format,
		path + 'dark-s_pz' + format, path + 'dark-s_nz' + format
	];

	const textureCube = new THREE.CubeTextureLoader().load( urls );

	scene = new THREE.Scene();
	scene.background = textureCube;

	document.body.appendChild( renderer.domElement );

	controls = new OrbitControls(camera, renderer.domElement);

	addLights();
	addCameraPlane();
	addTimeButton();
	restartButton();

	document.addEventListener( 'mousemove', onCursorMove );
	document.addEventListener( 'mousedown', onCursorDown );
	document.addEventListener( 'mouseup', onCursorUp );
	window.addEventListener( 'resize', onWindowResize );

	document.body.onkeydown = function(e) {
		if (e.key === " " ||
			e.code === "Space"
		) {
			if(HOLDING){
				currentRotation += Math.PI / 2;

				const axis = new CANNON.Vec3(0, 1, 0);
				const quaternion = new CANNON.Quaternion();
				quaternion.setFromAxisAngle(axis, currentRotation);
				INTERSECTED_PHYSICAL.quaternion.copy(quaternion);
			}
		}
	}
}

function initCannon(){
	world = new CANNON.World({
		gravity: new CANNON.Vec3(0, -5, 0), // m/s²
	});

	world.broadphase = new CANNON.NaiveBroadphase();
	world.solver.iterations = 50;

	world.defaultContactMaterial.contactEquationStiffness = 1e6;
	world.defaultContactMaterial.contactEquationRelaxation = 5;

	addGround();
}

function addCameraPlane(){
	let n = new THREE.Vector3();
	let cpp = new THREE.Vector3();
	cameraPlane = new THREE.Plane();

	cameraPlaneVariables.push(n);
	cameraPlaneVariables.push(cpp);

	//scene.add(new THREE.PlaneHelper( cameraPlane, 100, 0xffff00 ));
}

function addTimeButton(){
	const texture = new THREE.TextureLoader().load( 'textures/clock.jpg' );

	const materials = new THREE.MeshStandardMaterial({
		map: texture,
	})

	const geometry = new THREE.BoxGeometry(1, 1, 1 );

	timeButton = new THREE.Mesh(geometry, materials);
	timeButton.position.set(7.5,0.5,7.5);
	scene.add(timeButton);

	document.addEventListener('mousedown', onCursorDown)
}

function restartGame() {
	for (let i = 0; i < box.length; i++) {
		scene.remove(box[i].visualBox);
		world.removeBody(box[i].boxBody);
	}

	box = [];
	addBoxes();
}

function restartButton(){
	const texture = new THREE.TextureLoader().load( 'textures/restart-button.png' );

	const materials = [
		new THREE.MeshStandardMaterial({
			color:  new THREE.Color(0xffff),
		}),
		new THREE.MeshStandardMaterial({
			map: texture,
		}),
		new THREE.MeshStandardMaterial({
			color:  new THREE.Color(0x00ff00),
		})
	]
	const geometry = new THREE.CylinderGeometry(1, 1, 0.7, 32, 16);

	restartButtonMesh = new THREE.Mesh(geometry, materials);
	restartButtonMesh.position.set(-7.5, 0.35, 7.5);
	scene.add(restartButtonMesh);

	document.addEventListener('mousedown', function (){
		raycaster.setFromCamera(cursor, camera);
		const intersects = raycaster.intersectObject(restartButtonMesh);

		if (intersects.length > 0) {
			restartGame();
		}
	});
}


function addGround(){
	const groundBody = new CANNON.Body({
		type: CANNON.Body.STATIC,
		shape: new CANNON.Plane()
	});
	groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	world.addBody(groundBody);

	const texture = {
		textureAo : new THREE.TextureLoader().load( 'textures/ground/metal_0077_ao_1k.jpg' ),
		textureNormal : new THREE.TextureLoader().load( 'textures/ground/metal_0077_normal_opengl_1k.png' ),
		textureMap : new THREE.TextureLoader().load( 'textures/ground/metal_0077_color_1k.jpg' ),
		textureMetalic : new THREE.TextureLoader().load( 'textures/ground/metal_0077_metallic_1k.jpg' ),
		textureRoughness : new THREE.TextureLoader().load( 'textures/ground/metal_0077_roughness_1k.jpg' ),
	}

	for (const key in texture) {
		texture[key].repeat.set(4,4);
		texture[key].offset.set(0,0);
		texture[key].wrapS = texture[key].wrapT = THREE.RepeatWrapping;
	}

	const geometryPlane = new THREE.PlaneGeometry( 100, 100, 1, 1 );
	const materialPlane = new THREE.MeshStandardMaterial( {
		roughness: 0.5,
		map: texture.textureMap,
		aoMap: texture.textureAo,
		normalMap: texture.textureNormal,
		metalnessMap: texture.textureMetalic,
		roughnessMap: texture.textureRoughness,
		});

	const plane = new THREE.Mesh( geometryPlane, materialPlane );
	plane.position.copy(groundBody.position);
	plane.quaternion.copy(groundBody.quaternion);
	plane.position.y -= 0.1;
	plane.receiveShadow = true;
	scene.add( plane );
}

function addBox(x, y, z, rotation){
	var boxShape = new CANNON.Box(new CANNON.Vec3( 1.5, 0.5, 0.5 ));
	if(rotation){
		boxShape = new CANNON.Box(new CANNON.Vec3( 0.5, 0.5, 1.5 ));
	}

	var boxBody = new CANNON.Body({
		mass: 30,
		collisionFilterGroup: 1,
		collisionFilterMask: 1,
	})
	boxBody.addShape(boxShape);
	boxBody.position.set(x,y,z);
	boxBody.sleep();
	world.addBody(boxBody);

	var visualShape = new THREE.BoxGeometry( 3, 1, 1 );
	if(rotation){
		visualShape = new THREE.BoxGeometry( 1, 1, 3);
	}

	var visualMaterial = new THREE.MeshStandardMaterial( {
		map: blockTexture.textureMap,
		aoMap: blockTexture.textureMap,
		normalMap: blockTexture.textureNormal,
		roughnessMap: blockTexture.textureRoughness,
		} );

	var visualBox = new THREE.Mesh( visualShape, visualMaterial );
	visualBox.castShadow = true;
	visualBox.receiveShadow = true;

	scene.add( visualBox );

	return { boxBody, visualBox };
}

function addBoxes() {
	var gap = 0.02;
	for(var layers = 0; layers < MAXLAYERS; layers++){
		for(var bricks = 0; bricks < 3; bricks++){
			if(layers % 2 === 0){
				box.push(addBox(bricks + gap - 1, layers*1.001 + 0.5, gap, true))
			}else{
				box.push(addBox(gap, layers*1.001 + 0.5, bricks + gap - 1, false))
			}
		}
	}
}

function addLights(){
	var spotlight1, spotlight2, spotlight3, spotlight4;

	spotlight1 = new THREE.SpotLight(0xffffff);
	spotlights.push(spotlight1);

	spotlight2 = new THREE.SpotLight(0xffffff);
	spotlights.push(spotlight2);

	spotlight3 = new THREE.SpotLight(0xffffff);
	spotlights.push(spotlight3);

	spotlight4 = new THREE.SpotLight(0xffffff);
	spotlights.push(spotlight4);

	spotlights.forEach(spotlight => {
		spotlight.angle = Math.PI/6;
		spotlight.intensity = 350;
		spotlight.penumbra = 0.1;
		spotlight.castShadow = true;
		spotlight.target.position.set(0, 5, 0);

		scene.add(spotlight);
		scene.add(spotlight.target);
	});
	spotlight1.position.set(10, 15, 10);
	spotlight2.position.set(10, 15, -10);
	spotlight3.position.set(-10, 15, -10);
	spotlight4.position.set(-10, 15, 10);

	const ambientlight = new THREE.AmbientLight(0xffffff);
	ambientlight.intensity = 0.1;

	//scene.add( ambientlight );
}

function animate() {
	requestAnimationFrame( animate );
	world.step(1 / 60);

	for(var bricks = 0; bricks < 3 * MAXLAYERS; bricks++){
		box[bricks].visualBox.position.copy(box[bricks].boxBody.position);
		box[bricks].visualBox.quaternion.copy(box[bricks].boxBody.quaternion);
	}

	if(!HOLDING){
		getIntersection();
	}

	let camPos = camera.position;
	let objPos;
	if (INTERSECTED_VISUAL){
		objPos = INTERSECTED_VISUAL.object.position;
	}
	else{
		objPos = box[0].boxBody.position;
	}

	cameraPlaneVariables[0].subVectors(camPos, objPos).normalize();
	cameraPlaneVariables[1].copy(objPos);
	if(!HOLDING) {
		cameraPlane.setFromNormalAndCoplanarPoint(cameraPlaneVariables[0], cameraPlaneVariables[1]);
	}

	if (HOLDING && INTERSECTED_VISUAL && INTERSECTED_PHYSICAL){
		INTERSECTED_PHYSICAL.angularVelocity.set(0, 0, 0);
		INTERSECTED_PHYSICAL.velocity.set(0, 0, 0);

		const raycaster = new THREE.Raycaster();
		const intersection = new THREE.Vector3();

		raycaster.setFromCamera(cursor, camera);
		raycaster.ray.intersectPlane(cameraPlane, intersection);

		INTERSECTED_PHYSICAL.position.copy(intersection);
	}

	renderer.render( scene, camera );
}

function getIntersection(){
	raycaster.setFromCamera( cursor, camera );
	var intersects = raycaster.intersectObjects( scene.children );

	if (intersects.length > 0 && intersects?.[0]?.object?.geometry?.type !== "PlaneGeometry"
		&& intersects?.[0]?.object?.geometry?.type !== "CylinderGeometry" )
    { 
        if ( intersects[ 0 ] !== INTERSECTED_VISUAL )
        {
            if ( INTERSECTED_VISUAL)
				INTERSECTED_VISUAL.object.material.color.setHex( INTERSECTED_VISUAL.object.currentHex );
				INTERSECTED_VISUAL = intersects[ 0 ];
				INTERSECTED_VISUAL.object.currentHex = INTERSECTED_VISUAL.object.material.color.getHex();
				INTERSECTED_VISUAL.object.material.color.setHex( 0x00cccc );
        }
    }
    else
    {
        if ( INTERSECTED_VISUAL ) {
			INTERSECTED_VISUAL.object.material.color.setHex( INTERSECTED_VISUAL.object.currentHex );
		}
			INTERSECTED_VISUAL = null;
			INTERSECTED_PHYSICAL = null;
    }
}

function onCursorDown(){
	if ( INTERSECTED_VISUAL ){
		controls.enabled = false;
		box.forEach(element => {
			if (element.visualBox === INTERSECTED_VISUAL.object){
				INTERSECTED_PHYSICAL = element.boxBody;
			}
			element.boxBody.wakeUp();
		});
		HOLDING = true;
	}
}

function onCursorUp(){
	box.forEach(element => {
		element.boxBody.sleep();
	});
	controls.enabled = true;
	HOLDING = false;
}

function onCursorMove( event ){
	cursor.x = (event.clientX / window.innerWidth) * 2 -1;
	cursor.y = ((event.clientY / window.innerHeight) * 2 -1) * (-1);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth - 0.1, window.innerHeight - 0.1);
}

