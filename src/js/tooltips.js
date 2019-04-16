
function createTooltip(loc){

	var tt = d3.select('body').append('div')
		.attr('id','tooltip'+loc)
		.attr('class','tooltip')
		.style('font-size','20px')
		.style('display','block')
		.style('opacity',1)
	tt.append('span')
		.attr('id','tootltipClose')
		.attr('class','close buttonHover')
		.html('&times;')
		.on('click',function(){
			highlightSphere(false, loc);
		});
	tt.append('span')
		.attr('class','tooltipContent');


}
// for finding the circle based on clicks
function getClickedMesh(pageX, pageY, meshArray=params.spheres){

	var mpos = new THREE.Vector3(pageX,pageY, 0)
	var meshPos = new THREE.Vector3(0,0, 0)
	var dist = 1e100;
	var mesPos;
	var index = 0;
	meshArray.forEach(function(p,i){
		pos = screenXY(p)
		var tdist = mpos.distanceTo(pos); //need to add on depth?
		if (tdist < dist){ 
			dist = tdist
			meshPos = pos; 
			index = i;
		}
	});

	return {"index":index,
			"meshPos":meshPos
			};

}
function moveTooltip(meshIndex, offset=10, meshArray=params.spheres, ){
	var tt = d3.select('#tooltip'+meshIndex)
	var mesh = meshArray[meshIndex];

	pos = screenXY(mesh);
	tt.style("top",pos.y+offset )
	tt.style("left", pos.x+offset );
	tt.select('.tooltipContent').html("x="+mesh.position.x+" y="+mesh.position.y+" z="+mesh.position.z);

}
function highlightSphere(bool, loc, meshArray=params.spheres){

	var color = params.sphereColor;
	var boxName = "sphereBox"+loc;
	if (bool){
		color = params.highlightColor;
		var test = params.scene.getObjectByName(boxName);
		if (test == null){
			var box = new THREE.Box3().setFromObject( meshArray[loc] );
			var helper = new THREE.Box3Helper( box, params.highlightColor );
			helper.name = boxName;
			params.scene.add( helper );
		}
	} else {
		params.scene.remove( params.scene.getObjectByName(boxName) ); //remove the box
		params.ttMeshIndex.splice(params.ttMeshIndex.indexOf(loc),1); //remove the value from the ttMeshIndex array
		d3.select('#tooltip'+loc).remove(); //remove the tooltip
		params.scene.remove( params.scene.getObjectByName('ttArrow') ); //remove any arrow 
		params.scene.remove( params.scene.getObjectByName('ttPlane') ); //remove any arrow 
		if (params.ttMeshIndex.length == 2){//draw back an arrow if we've removed a plane
			drawTTarrow();
		}		

	}
	meshArray[loc].material.color.setHex(color);
}

//https://stackoverflow.com/questions/26714230/draw-arrow-helper-along-three-line-or-two-vectors
function drawTTarrow(meshArray=params.spheres){
	var from = meshArray[params.ttMeshIndex[0]].position.clone();
	var to = meshArray[params.ttMeshIndex[1]].position.clone();
	var direction = to.sub(from);
	var length = direction.length();
	var arrowHelper = new THREE.ArrowHelper(direction.normalize(), from, length, params.highlightColor, params.size/10., params.size/10. );
	arrowHelper.name = 'ttArrow'
	params.scene.add( arrowHelper );
}

//see info here: https://github.com/mrdoob/three.js/issues/5312
//https://stackoverflow.com/questions/40366339/three-js-planegeometry-from-math-plane
function drawTTplane(meshArray=params.spheres){

	var p1 = meshArray[params.ttMeshIndex[0]].position.clone();
	var p2 = meshArray[params.ttMeshIndex[1]].position.clone();
	var p3 = meshArray[params.ttMeshIndex[2]].position.clone();
	//trying to avoid issues when it doesn't get the plane correct (when you click on a corner and the normal is the same direction)
	p1.multiplyScalar(0.999);
	p2.multiplyScalar(0.999);
	p3.multiplyScalar(0.999);
	var plane = new THREE.Plane().setFromCoplanarPoints(p1, p2, p3);

	// Create a basic  geometry
	var geometry = new THREE.PlaneGeometry( 3.*params.size, 3.*params.size, 1 );
	var material = new THREE.MeshBasicMaterial( {
		color: params.highlightColor, 
		side: THREE.DoubleSide,
	});

	// Align the geometry to the plane
	var coplanarPoint = new THREE.Vector3();
	plane.coplanarPoint(coplanarPoint); //this fails when focalPoint == 0,0,0
	var focalPoint = new THREE.Vector3().copy(coplanarPoint).add(plane.normal);
	geometry.lookAt(focalPoint);
	geometry.translate(coplanarPoint.x, coplanarPoint.y, coplanarPoint.z);
	console.log("plane",params.ttMeshIndex,p1, p2, p3, coplanarPoint, plane.normal, focalPoint)

	// Create mesh with the geometry
	var planeMesh = new THREE.Mesh(geometry, material);
	planeMesh.name = 'ttPlane';
	params.scene.add(planeMesh);

}
function screenXY(mesh){

	var vector = mesh.position.clone();
	var w = d3.select('#WebGLContainer');
	var width = parseFloat(w.style('width'));
	var height = parseFloat(w.style('height'));
	var left = parseFloat(w.style('left'));
	var top = parseFloat(w.style('top'));

	vector.project(params.camera);

	vector.x = ( vector.x * width/2. ) + width/2. + left;
	vector.y = - ( vector.y * height/2. ) + height/2. + top;

	screenXYcheck = true;
	if (vector.z > 1){
		screenXYcheck = false;
	}

	vector.z = 0;

	return vector;
}

function showTooltip(e, pageX = null, pageY = null){



	//e = d3.event;
	if (pageX == null) pageX = e.pageX;
	if (pageY == null) pageY = e.pageY;

	var clicked = getClickedMesh(pageX, pageY);
	createTooltip(clicked['index']);

	if (params.keyboard.pressed("shift")){
		params.ttMeshIndex.push(clicked['index']);
	} else {
		params.ttMeshIndex.forEach(function(foo, i){
			highlightSphere(false, i); //turn off previous highlighting
		});
		params.ttMeshIndex = [clicked['index']];
	}

	if (params.ttMeshIndex.length > 3){ //only allow three to be highlighted
		highlightSphere(false, params.ttMeshIndex[2]); //turn off previous highlighting
		params.ttMeshIndex = params.ttMeshIndex.slice(0,2);
		params.ttMeshIndex.push(clicked['index']);
	}


	params.ttMeshIndex.forEach(function(loc){
		moveTooltip(loc); //move it into position
		highlightSphere(true, loc); //highlight the sphere
	})

	if (params.ttMeshIndex.length == 2){
		params.scene.remove( params.scene.getObjectByName('ttPlane') ); //remove any plane 
		drawTTarrow();
	}
	if (params.ttMeshIndex.length == 3){
		params.scene.remove( params.scene.getObjectByName('ttArrow') ); //remove any arrow 
		drawTTplane();
	}
}


///////////////////////////
// runs on load
///////////////////////////
d3.select('#WebGLContainer').node().addEventListener("dblclick", showTooltip);
//d3.select('#WebGLContainer').on("dblclick", showTooltip); //not sure why I can't make this work in a d3 way

