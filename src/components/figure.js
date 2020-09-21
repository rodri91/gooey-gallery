import * as THREE from 'three'
import { TweenMax } from 'gsap'
import vertexShader from './glsl/vertexShader.glsl'


export default class Figure {
  constructor($el, scene, fragmentShader) {
    this.scene = scene

    this.$els = {
      el: $el,
      link: $el.querySelector('a'),
      image: $el.querySelector('.tile__image')
    }
    this.images = []
    this.vertexShader = vertexShader;
    this.fragmentShader = fragmentShader;

    this.loader = new THREE.TextureLoader()
    this.clock = new THREE.Clock()

    this.$els.image.style.opacity = 0
    this.sizes = new THREE.Vector2(0, 0)
    this.offset = new THREE.Vector2(0, 0)
    
    this.mouse = new THREE.Vector2(0, 0)
    this.preload([this.$els.image.src, this.$els.image.dataset.hover], () => { this.start() })
  }

  start() {
    this.$els.link.addEventListener('mouseenter', () => { this.onPointerEnter() })
    this.$els.link.addEventListener('mouseleave', () => { this.onPointerLeave() })
    window.addEventListener('mousemove', (e) => { this.onMouseMove(e) })

    this.getSizes()

    this.createMesh()
  }
  
  getSizes() {
    const { width, height, top, left } = this.$els.image.getBoundingClientRect()
    
    if (!this.sizes.equals(new THREE.Vector2(width, height))) {
      this.sizes.set(width, height)
    }

    if (!this.offset.equals(new THREE.Vector2(left - window.innerWidth / 2 + width / 2, -top + window.innerHeight / 2 - height / 2))) {
        this.offset.set(left - window.innerWidth / 2 + width / 2, -top + window.innerHeight / 2 - height / 2)
    }
  }

  createMesh() {
    this.geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);

    const texture = this.images[0]
    const hoverTexture = this.images[1]

    this.uniforms = {
      u_alpha: { value: 1 },
      u_map: { type: 't', value: texture },
      u_ratio: { value: getRatio(this.sizes, texture.image) },
      u_hovermap: { type: 't', value: hoverTexture },
      u_hoverratio: { value: getRatio(this.sizes, hoverTexture.image) },
      u_shape: { value: this.images[2] },
      u_mouse: { value: this.mouse },
      u_progressHover: { value: 0 },
      u_progressClick: { value: 0 },
      u_time: { value: this.clock.getElapsedTime() },
      u_res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    }
    
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true,
      defines: {
          PI: Math.PI,
          PR: window.devicePixelRatio.toFixed(1),
      },
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)

    this.mesh.position.x = this.offset.x
    this.mesh.position.y = this.offset.y

    this.mesh.scale.set(this.sizes.x, this.sizes.y, 1)
		this.scene.add(this.mesh)
  }

  onPointerEnter() {
    this.isHovering = true

    if (this.isZoomed || this.hasClicked) return

    const idx = clamp([...this.$els.el.parentElement.children].indexOf(this.$els.el) + 1, 1, 5)

    document.documentElement.style.setProperty('--color-bg', `var(--color-bg${idx})`)
    document.documentElement.style.setProperty('--color-text', `var(--color-text${idx})`)

    if (!this.mesh) return

    TweenMax.to(this.uniforms.u_progressHover, .5, {
        value: 1,
        ease: Power2.easeInOut,
    })
  }

  onPointerLeave() {
    if (!this.mesh || this.isZoomed || this.hasClicked ) return
    this.isHovering = false;

    TweenMax.to(this.mesh.rotation, 0.5, {
      x: 0,
      y: 0
    })

    TweenMax.to(this.uniforms.u_progressHover, .5, {
        value: 0,
        ease: Power2.easeInOut,
    })
  }

  onMouseMove(event) {  
    TweenMax.to(this.mouse, 0.5, {
      x: event.clientX,
      y: event.clientY,
    })


    if(this.isHovering) {
      const pointX = (event.clientX / window.innerWidth) * 2 - 1;
      const pointY = -(event.clientY / window.innerHeight) * 2 + 1;
      console.log('mou')
      TweenMax.to(this.mesh.rotation, 0.5, {
        x: -pointY * 0.3,
        y: pointX * (Math.PI / 6)
      })
    }

  }

  update() {
    if (!this.isHovering) return
    this.uniforms.u_time.value += this.clock.getDelta()
  }

  preload($els, allImagesLoadedCallback) {
    let loadedCounter = 0
    const toBeLoadedNumber = $els.length
    const preloadImage = ($el, anImageLoadedCallback) => {
        const image = this.loader.load($el, anImageLoadedCallback)
        image.center.set(0.5, 0.5)
        this.images.push(image)
    }

    $els.forEach(($el) => {
        preloadImage($el, () => {
            loadedCounter += 1
            if (loadedCounter === toBeLoadedNumber) {
                allImagesLoadedCallback()
            }
        })
    })
  }
}

export const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val))

const multiplyMatrixAndPoint = (matrix, point) => {
  const c0r0 = matrix[0]
  const c1r0 = matrix[1]
  const c0r1 = matrix[2]
  const c1r1 = matrix[3]
  const x = point[0]
  const y = point[1]
  return [Math.abs(x * c0r0 + y * c0r1), Math.abs(x * c1r0 + y * c1r1)]
}

const rotateMatrix = (a) => [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a)]

const getRatio = ({ x: w, y: h }, { width, height }, r = 0) => {
  const m = multiplyMatrixAndPoint(rotateMatrix(THREE.Math.degToRad(r)), [w, h])
  const originalRatio = {
      w: m[0] / width,
      h: m[1] / height,
  }

  const coverRatio = 1 / Math.max(originalRatio.w, originalRatio.h)

  return new THREE.Vector2(
      originalRatio.w * coverRatio,
      originalRatio.h * coverRatio,
  )
}