'use strict';

// noinspection JSUnusedGlobalSymbols, ES6ConvertVarToLetConst
var visualisation = (() => {

  /**
   * @param {rocklog.vis.Vec3 }dim
   * @constructor
   */
  const FillableSpace = function (dim) {

    const _self = this;

    const size = dim.x * dim.y * dim.z;
    const positions = {};

    const makeId = (x, y, z) => `${x}-${y}-${z}`;

    ////  PUBLIC METHODS  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 

    _self.hasSpace = () => Object.values(positions).length < size;

    /**
     * @param {Object3D} obj
     */
    _self.put = (obj) => {

      if (!_self.hasSpace()) {
        return;
      }

      for (let y = 0; y < dim.y; y++) {
        for (let z = 0; z < dim.z; z++) {
          for (let x = 0; x < dim.x; x++) {

            const pos = makeId(x, y, z);

            if (!positions[pos]) {

              positions[pos] = obj;
              obj.position.set(x, y, z).addScalar(0.5);
              obj.renderOrder = y * 100 + 1;

              return;
            }
          }
        }
      }
    };

    /**
     * @param {Object3D} obj
     */
    this.remove = (obj) => {
      Object.keys(positions).forEach(it => positions[it] === obj && delete (positions[it]));
    }
  };

  const Animations = {
    /**
     * @param {Mesh}   mesh
     * @param {number} duration
     */
    makeStockDisappear: (mesh, duration = 500) => {
      anime({
        targets: mesh.scale,
        x: 0,
        y: 0,
        z: 0,
        duration: duration,
        easing: 'easeInQuad',
      });

      mesh.material = mesh.material.clone();
      anime({
        targets: mesh.material,
        opacity: 0,
        duration: duration,
        easing: 'easeInQuad',
        complete: () => mesh.parent && mesh.parent.remove(mesh),
      });
    },

    /**
     * @param {Mesh} mesh
     * @param {number} duration
     */
    makeStockAppear: (mesh, duration = 500) => {

      mesh.scale.x = 0.01;
      mesh.scale.y = 0.01;
      mesh.scale.z = 0.01;

      anime({
        targets: mesh.scale,
        x: 1,
        y: 1,
        z: 1,
        duration: duration,
        easing: 'easeOutQuad',
      });
    },

    flashStock: (mesh, duration = 500) => {

      anime({
        targets: mesh.scale,
        keyframes: [
          {
            x: 0.5,
            y: 0.5,
            z: 0.5,
            duration: 200,
            easing: 'easeInQuad',
          },
          {
            x: 1,
            y: 1,
            z: 1,
            easing: 'easeOutElastic',
            duration: duration,
          },
        ],
      });
    }
  };

  /**
   * @param {Scene}                       scene
   * @param {rocklog.vis.StorageLocation} data
   * @constructor
   */
  const StorageLocation = function (scene, data) {

    const _self = this;

    let positions = new FillableSpace(data.dim);

    let cubeGeo = new THREE.BoxBufferGeometry(0.8, 0.8, 0.8, 10, 10);
    let cubeMat = new THREE.MeshStandardMaterial({color: 0x6060A0, opacity: 0.9, transparent: true, metalness: 0.1, roughness: 0.5});
    let locMat = new THREE.MeshStandardMaterial({color: 0x50A0DD, opacity: 0.5, transparent: true, metalness: 0.35, roughness: 0.85});

    let container = new THREE.Object3D();
    container.position.set((data.pos.x), (data.pos.y), (data.pos.z));
    scene.add(container);

    let geo = new THREE.BoxBufferGeometry(data.dim.x, 0.15, data.dim.z, 10, 10);
    let mesh = new THREE.Mesh(geo, locMat);
    mesh.renderOrder = data.pos.y * 100;
    mesh.position.set((data.dim.x / 2), 0, (data.dim.z / 2));
    container.add(mesh);

    ////  PUBLIC PROPERTIES  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    _self.id = data.id;
    _self.mesh = mesh;

    ////  PUBLIC METHODS  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param {rocklog.vis.Stock} stock
     */
    _self.addStock = (stock) => {

      if (positions.hasSpace()) {

        const cube = makeCube(stock);
        container.add(cube);
        positions.put(cube);

        Animations.makeStockAppear(cube);
      }
    };

    /**
     * @param {rocklog.vis.Stock} stock
     */
    _self.updateStock = (stock) => {

      const first = findCubeById(stock.id);

      if (first) {
        Animations.flashStock(first);
      }
    };

    _self.removeStockById = (id) => {

      const first = findCubeById(id);

      if (first) {
        Animations.makeStockDisappear(first);
        positions.remove(first);
      }
    };

    /**
     * @return {Object3D[]}
     */
    _self.getAllClickableObjects = () => container.children.concat();

    ////  PRIVATE METHODS  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param {string} id
     */
    const findCubeById = (id) => {
      return container.children.filter(it => !!it.userData && it.userData.id === id)[0];
    };

    /**
     * @param {rocklog.vis.Stock} stock
     *
     * @return {Mesh}
     */
    const makeCube = (stock) => {

      const material = cubeMat.clone();

      if (stock.color) {
        material.color = new THREE.Color(stock.color);
      }

      let mesh = new THREE.Mesh(cubeGeo, material);
      mesh.userData = stock;

      return mesh;
    };
  };

  /**
   *
   * @param {Scene}                  scene
   * @param {rocklog.vis.StorageVis} data
   * @constructor
   */
  const StorageScene = function (scene, data) {

    const _self = this;

    let grid = new THREE.GridHelper(20, 20);
    grid.material.transparent = true;
    grid.material.opacity = 0.3;

    /**
     * @type {{[string] : StorageLocation}}
     */
    let locations = {};

    _self.start = () => {
      // scene.add(grid);

      locations = data.locations.reduce((acc, it) => {
        acc[it.id] = new StorageLocation(scene, it);
        return acc;
      }, {});

      data.stocks.forEach(it => this.addStock(it));
    };

    _self.stop = () => {

    };

    /**
     * @param {rocklog.vis.Stock} stock
     */
    _self.addStock = (stock) => locations[stock.locId] && locations[stock.locId].addStock(stock);

    /**
     * @param {rocklog.vis.Stock} stock
     */
    _self.updateStock = (stock) => locations[stock.locId] && locations[stock.locId].updateStock(stock);

    /**
     * @param {string} id
     */
    _self.removeStockById = (id) => Object.values(locations).forEach(it => it.removeStockById(id));

    /**
     * @return {Object3D[]}
     */
    _self.getAllClickableObjects = () => Object.values(locations).flatMap(location => location.getAllClickableObjects());
  };

  /**
   * @param {{
   *   container: HTMLElement,
   *   data: rocklog.vis.StorageVis,
   * }} options
   * @constructor
   */
  const StorageViz = function (options) {

    const _self = this;

    if (WEBGL.isWebGLAvailable() === false) {
      throw new Error("WEBGL not supported");
      // document.body.appendChild(WEBGL.getWebGLErrorMessage());
    }

    /** @type {Scene} */
    let scene;
    /** @type {PerspectiveCamera} */
    let camera;
    /** @type {WebGLRenderer} */
    let renderer;
    /** @type {OrbitControls} */
    let controls;
    /** @type {DirectionalLight} */
    let directionalLight;
    /** @type {Raycaster} */
    let raycaster = new THREE.Raycaster();

    /** @type {StorageScene} */
    let scenery = null;

    //// PUBLIC FUNCTIONS //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    _self.start = () => {
      setup();
      render();
    };

    _self.stop = () => {
      teardown();
    };

    _self.getScenery = () => scenery;

    //// PRIVATE FUNCTIONS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** @return {number} */
    const width = () => options.container.clientWidth;

    /** @return {number} */
    const height = () => options.container.clientHeight;

    const setup = () => {

      camera = new THREE.PerspectiveCamera(90, width() / height(), 0.1, 10000);
      // camera = new THREE.OrthographicCamera( width() / - 2, width() / 2, height() / 2, height() / - 2, 1, 1000 );
      camera.position.set(5, 8, 13);
      camera.lookAt(0, 0, 0);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xFFFFFF);

      // scene.background = fogColor;
      // scene.fog = new THREE.Fog(0xFFFFFF, 5, 75);

      // lights

      let ambientLight = new THREE.AmbientLight(0xB0B0B0, 1);
      scene.add(ambientLight);

      // // directionalLight = new THREE.PointLight(0xDDBBDD, 0.5, 0, 2);
      let stationaryLight = new THREE.DirectionalLight(0xFFFFFF, 0.75);
      stationaryLight.position.set(0, 16, 0);
      stationaryLight.lookAt(0, 0, 0);
      scene.add(stationaryLight);

      // directionalLight = new THREE.PointLight(0xDDBBDD, 0.5, 0, 2);
      directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
      directionalLight.position.set(10, 16, 26);
      directionalLight.lookAt(0, 0, 0);
      scene.add(directionalLight);

      // renderer

      renderer = new THREE.WebGLRenderer({antialias: true});
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width(), height());
      options.container.appendChild(renderer.domElement);

      // resize listener

      window.addEventListener('resize', onWindowResize, false);
      renderer.domElement.addEventListener('click', onRendererClick, false);

      // orbit controls

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.addEventListener("change", onControls);

      // the real scene
      scenery = new StorageScene(scene, options.data);
      scenery.start();
    };

    const teardown = () => {

      window.removeEventListener('resize', onWindowResize);
      renderer.domElement.removeEventListener('click', onRendererClick);

      controls.removeEventListener('change', onControls);
      controls.dispose();

      // remove from the dom
      while (options.container.lastChild) {
        options.container.removeChild(options.container.lastChild)
      }

      renderer.dispose();
      renderer = null;

      scene.dispose();
      scene = null;

      scenery.stop();
      scenery = null;
    };

    const onControls = () => {
      directionalLight.position.copy(camera.position);
    };

    const onWindowResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();

      renderer.setSize(width(), height());
    };

    const onRendererClick = (event) => {
      
      // see https://threejs.org/docs/#api/en/core/Raycaster
      const mouse = {
        x: + (event.offsetX / width()) * 2 - 1, 
        y: - (event.offsetY / height()) * 2 + 1,
      };
      
      console.log(event, mouse);
      
      if (scene) {
        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // calculate objects intersecting the picking ray
        /**
         * @type {Intersection[]}
         */
        let intersects = raycaster.intersectObjects(scenery.getAllClickableObjects());

        console.log(intersects);
        
        if (intersects.length > 0) {

          /**
           * @type {Mesh|*}
           */
          const obj = intersects[0].object;
          
          obj && obj.material && obj.material.color.set(0xff0000);
        }
      }
    };
    
    const render = () => {

      if (scene) {
        window.requestAnimationFrame(render);

        renderer.render(scene, camera);
      }
    };
  };

  return {
    StorageViz
  }
})();



