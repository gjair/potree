
export class PolygonClipVolume extends THREE.Object3D{
	
	constructor(camera){
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.camera = camera.clone();
		this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
		this.camera.rotation.order = camera.rotation.order;
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		this.initialized = false;
		this.uid = false;
	}

	addMarker() {

		let marker = new THREE.Mesh();

		let cancel;

		let drag = e => {
			let size = e.viewer.renderer.getSize(new THREE.Vector2());
			let projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			marker.position.copy(projectedPos);
		};
		
		let drop = e => {	
			cancel();
		};
		
		cancel = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};
		
		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);


		this.markers.push(marker);
	}

	removeLastMarker() {
		if(this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
		}
	}

	showEditLabelDialog(label) {
		const updateLabel = this.updateAnnotationLabel.bind(this);
		var clonModal = $('#selection-modal').clone();
		clonModal.modal().find('input').val(label);
		var polygonid = this.uid;
		var polyClip;
		function selectionHandler(e){
			if(e.target.matches('#save-selection')){
				var form = document.querySelector('#selection-form');
				form.addEventListener('submit',function(){
					form.preventDefault();
				return false;
				});
				var name = clonModal.find('input[name="label-name-input"]').val();
				updateLabel(name);
				if(polygonid == false){
					var lastIndex = viewer.scene.polygonClipVolumes.length - 1;
					polyClip = [viewer.scene.polygonClipVolumes[lastIndex]];
				} else {
					polyClip = viewer.scene.polygonClipVolumes.filter((el) => {
						if(polygonid == el.userData.annotationData.userData.uid){
							return el;
						}
					});
				}
				if(savePolygon !== undefined){
					console.log(polyClip[0]);
					savePolygon(Potree.PolygonClipVolume.exportAnnotationItem(polyClip));
				}
				clonModal.modal('hide');
				clonModal.remove();
			}
			if(e.target.matches('#cancel-selection')){
				clonModal.modal('hide');
				clonModal.remove();
			// var volData = viewer.scene.polygonClipVolumes.pop();
			// viewer.scene.annotations.remove(volData.userData.annotationData);
			}
		}

		const selectionModal = clonModal[0];
		selectionModal.addEventListener('click',selectionHandler);

	}

	updateAnnotationLabel(name) {
		this.userData.annotationData.title = this.buildAnnotationControls(name);
		this.userData.annotationData.annotationLabel = name;
	}

	buildAnnotationControls(name) {
		let elTitle = $(`<span>${(name || '') + '&nbsp;'} </span>`);
		let deleteButton = $(`<a href="#" style="margin:5px;"><i class="icon-trash"></i></a>`);
		deleteButton.click( () => {
			if(deletePolygon !== undefined){
				deletePolygon(this.uid);
			}
			viewer.scene.polygonClipVolumes = viewer.scene.polygonClipVolumes.filter((annotation) => {
				return annotation.uuid != this.uuid;
			});
			viewer.scene.annotations.remove(this.userData.annotationData);
		});
		elTitle.append(deleteButton);

		let editButton = $(`<a href="#" style="margin:5px;"><i class="icon-pencil"></i></a>`);
		editButton.click( () => {
			this.showEditLabelDialog(name);
		});
		elTitle.append(editButton);

		// Give the annotation a meaningful string representation for the sidebar
		elTitle.toString = () => name;
		return elTitle;
	}

	addAnnotationLabel(location, annotationLabel, isNew) {
		let addAnnotation = (name) => {
		let polyClipVol = this;
		let elTitle = this.buildAnnotationControls(name);
		let annotationLabel = new Potree.Annotation({
			position: location,
			title: elTitle,
		});
		annotationLabel.annotationLabel = name;
		viewer.scene.annotations.add(annotationLabel);   // show Annotation label
		if (!this.userData) this.userData = {};
			// linking PolygonClipVolume and Annotation object so we can edit/delete them transactionally
		this.userData.annotationData = annotationLabel;
		annotationLabel.userData = polyClipVol;
		return polyClipVol;
		};

		addAnnotation(annotationLabel);

		if (isNew) {
			this.showEditLabelDialog(name);
		}
	}

	static exportAnnotationItem(polygonClip) {
	  // in order to able to restore the annotated data, we must exports following informations of a given polygon:
	  // - the polygon markers
	  // - the camera state
	  // - the Annotation state
	  let annotations = polygonClip;
	  if(annotations.length < 1){
		return {};
	  }
	  let dumpJSON = annotations.map(function(annotation) {
		let markers = annotation.markers.map(function(marker) {
		  return marker.position;
		});
		let json = {
		  id: annotation.userData.annotationData.userData.uid,
		  annotationObject : {
			camera: {
			  matrix: annotation.camera.matrix.toArray(),
			  aspect: annotation.camera.aspect,
			  near: annotation.camera.near,
			  far: annotation.camera.far,
			  fov: annotation.camera.fov
			},
			markers: markers
		  },
		  annotationLabel : {
			label: annotation.userData.annotationData.annotationLabel,
			position: annotation.userData.annotationData.position,
			cameraPosition: annotation.userData.annotationData.cameraPosition,
			cameraTarget: annotation.userData.annotationData.cameraTarget
		  }
		};
		return json;
	  });
	  return dumpJSON[0];
	}


	static exportAnnotationData(name) {
	  // in order to able to restore the annotated data, we must exports following informations of a given polygon:
	  // - the polygon markers
	  // - the camera state
	  // - the Annotation state
	  let annotations = viewer.scene.polygonClipVolumes;
	  let dumpJSON = annotations.map(function(annotation) {
		let markers = annotation.markers.map(function(marker) {
		  return marker.position;
		});
		let json = {
		  id: annotation.userData.annotationData.userData.uid,
		  annotationObject : {
			camera: {
			  matrix: annotation.camera.matrix.toArray(),
			  aspect: annotation.camera.aspect,
			  near: annotation.camera.near,
			  far: annotation.camera.far,
			  fov: annotation.camera.fov
			},
			markers: markers
		  },
		  annotationLabel : {
			label: annotation.userData.annotationData.annotationLabel,
			position: annotation.userData.annotationData.position,
			cameraPosition: annotation.userData.annotationData.cameraPosition,
			cameraTarget: annotation.userData.annotationData.cameraTarget
		  }
		};
		return json;
	  });
	  return dumpJSON;
	}

	static importAnnotationData(data) {
	  function createMarker(position) {
		let newMarker = new THREE.Mesh();
		newMarker.position.copy(position);
		return newMarker;
	  }
	  function newClipVol(id=null, camera, markers){
		// reconstruct the camera state
		let reconstructCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
		reconstructCamera.matrix.fromArray(camera.matrix);
		reconstructCamera.matrix.decompose(reconstructCamera.position, reconstructCamera.quaternion, reconstructCamera.scale);

		  // reconstruct polygon
		let newVol = new Potree.PolygonClipVolume(reconstructCamera);
		markers.forEach(function(marker) {
		  newVol.markers.push(createMarker(marker));
		});
		newVol.initialized = true;
		newVol.uid = id;
		return newVol;
	  }
	  function createAnnotationLabel(polyClipVol, labelData) {
		let location = [labelData.position.x, labelData.position.y, labelData.position.z];
		polyClipVol.addAnnotationLabel(location, labelData.label);
	  }

	  data.forEach(function(annotation) {
		let polyClipVol = newClipVol(annotation.id, annotation.annotationObject.camera, annotation.annotationObject.markers);
		viewer.scene.addPolygonClipVolume(polyClipVol);
		createAnnotationLabel(polyClipVol, annotation.annotationLabel);
	  });
	}

};
