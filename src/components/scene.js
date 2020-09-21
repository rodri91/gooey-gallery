import * as THREE from 'three'
import Figure from './figure'
import revealShader from './glsl/revealShader.glsl'
import trippyShader from './glsl/trippyShader.glsl'

const perspective = 800;
const shaders = [
  revealShader,
  trippyShader
]

export default class Scene {
  constructor() {
    this.container = document.getElementById('stage');
    this.$tiles = document.querySelectorAll('.tile');
    
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      alpha: true,
    })

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // this.figure = new Figure(this.scene)
    this.tiles = Array.from(this.$tiles).map(($el, i) => new Figure($el, this.scene, shaders[1]))
    
    this.initLights();
    this.initCamera();
    this.update();
  }

  initLights() {
    const ambientlight = new THREE.AmbientLight(0xffffff, 2)
		this.scene.add(ambientlight)
  }

  initCamera() {
    const fov = (180 * (2 * Math.atan(window.innerHeight / 2 / perspective))) / Math.PI

	  this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 1, 1000)
	  this.camera.position.set(0, 0, perspective)
  }

  update() {
    requestAnimationFrame(this.update.bind(this))

    this.tiles.forEach((tile) => {
      tile.update()
    })
	
	  this.renderer.render(this.scene, this.camera)
  }
}