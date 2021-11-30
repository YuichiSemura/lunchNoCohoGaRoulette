var render;
var camera;
var scene;
var rouletteGroup;
// 原点
var ORIGIN = new THREE.Vector3(0, 0, 0);

// キャンバスの初期設定
function setThree() {
  // サイズを指定
  const width = $("#myCanvas").parent().width() - 20;
  const height = 800;
  const ereaSize = 400;
  // レンダラーを作成
  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#myCanvas'),
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  // シーンを作成
  scene = new THREE.Scene();
  // カメラを作成
  camera = new THREE.PerspectiveCamera(45, width / height);
  camera.position.set(0, ereaSize * 0.4, ereaSize * 0.5);
  camera.lookAt(ORIGIN);
  // カメラコントロールの設定
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  // 光源を作成
  addLight(scene, ereaSize);
  // 地面を作成
  addFloor(scene, ereaSize);
  // 針を作成
  addCone(scene, ereaSize);
  // サイズ3のルーレット作成
  addCylinders();
  // 毎フレーム実行
  tick();

  function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
}

// 照明の追加
function addLight(scene, ereaSize) {
  const spotLight = new THREE.PointLight(0xFFFFFF, 3.4, 6000, 2.0);
  spotLight.position.set(ereaSize * 0.2, ereaSize * 0.2, ereaSize * 0.2);
  spotLight.castShadow = true; // 影を落とす設定
  scene.add(spotLight);

  // 環境光
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2);
  scene.add(ambientLight);
}

// 床壁を追加
function addFloor(scene, ereaSize) {
  const floorGeometry = new THREE.PlaneGeometry(ereaSize, ereaSize);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x66BBDD,
    roughness: 0.03,
    metalness: 0.75
  });
  const floorXZ = new THREE.Mesh(floorGeometry, floorMaterial);
  floorXZ.rotation.x = -Math.PI / 2;
  floorXZ.position.set(0, -ereaSize / 2, 0);
  scene.add(floorXZ);

  const floorYZ = new THREE.Mesh(floorGeometry, floorMaterial);
  floorYZ.position.set(0, 0, -ereaSize / 2);
  scene.add(floorYZ);

  const floorXY = new THREE.Mesh(floorGeometry, floorMaterial);
  floorXY.rotation.y = Math.PI / 2;
  floorXY.position.set(-ereaSize / 2, 0, 0);
  scene.add(floorXY);

  const floorXZ2 = new THREE.Mesh(floorGeometry, floorMaterial);
  floorXZ2.rotation.x = Math.PI / 2;
  floorXZ2.position.set(0, ereaSize / 2, 0);
  scene.add(floorXZ2);

  const floorYZ2 = new THREE.Mesh(floorGeometry, floorMaterial);
  floorYZ2.rotation.y = Math.PI;
  floorYZ2.position.set(0, 0, ereaSize / 2);
  scene.add(floorYZ2);

  const floorXY2 = new THREE.Mesh(floorGeometry, floorMaterial);
  floorXY2.rotation.y = -Math.PI / 2;
  floorXY2.position.set(ereaSize / 2, 0, 0);
  scene.add(floorXY2);
}

// ルーレットの針を追加
function addCone(scene) {
  var geometry = new THREE.ConeBufferGeometry(3, 40, 30);
  var material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    roughness: 0.03,
    metalness: 0.6
  });
  var cone = new THREE.Mesh(geometry, material);
  cone.position.set(0, 65, -80);
  cone.rotation.set(-Math.PI * 1.2, 0, 0);
  scene.add(cone);
}

// 円盤作り
function addCylinders() {
  // データ作り
  var lunch = ["陳麻婆豆腐", "陳麻婆豆腐", "陳麻婆豆腐"];
  // 色のランダム生成
  var color = [];
  var memo = Math.random() * 360;
  for (var j in lunch) {
    if (lunch.length > 2 && j == lunch.length - 1) {
      var avg = (color[0] + color[j - 1]) / 2;
      const h = Math.abs(color[0] - color[j - 1]) > 180 ? avg : avg + 180;
      color.push(h);
    } else {
      const h = (memo + 90 + Math.random() * 180) % 360;
      color.push(h);
      memo = h;
    }
  }
  scene.remove(rouletteGroup);
  rouletteGroup = new THREE.Group();

  // ケーキの追加
  for (var i in lunch) {
    (function(i, color, rouletteGroup) {

      // 円の追加
      var han = 60;
      var rad = Math.PI * 2 * i / lunch.length + Math.PI * (1 + 2 / lunch.length);
      var geometryc = new THREE.CylinderGeometry(
        80, 80, 30, 300, 10, false, -rad, Math.PI * 2 / lunch.length);
      var materialc = new THREE.MeshStandardMaterial({
        color: `hsl(${color[i]}, 90%, 70%)`,
        roughness: 0.02,
        metalness: 0.7
      });
      materialc.side = THREE.DoubleSide;
      var circle = new THREE.Mesh(geometryc, materialc);
      circle.position.set(0, 30, 0);
      circle.receiveShadow = true;
      rouletteGroup.add(circle);

      // 数字の追加
      var loader = new THREE.FontLoader();
      loader.load('json/helvetiker_bold.typeface.json', function(font) {
        var text = Number(i) + 1; /* lunch[i].toString() */
        var textGeometry = new THREE.TextGeometry(String(text), {
          font: font,
          size: 15,
          height: 10,
          curveSegments: 12
        });
        var materials = [
          new THREE.MeshBasicMaterial({
            color: 0xFFFFFF
          }),
          new THREE.MeshBasicMaterial({
            color: 0xAAAAAA
          })
        ];
        var textMesh = new THREE.Mesh(textGeometry, materials);

        // 文字オブジェクトのサイズ取得と微調整
        textMesh.geometry.computeBoundingBox();
        var box = textMesh.geometry.boundingBox.clone();
        var center = box.getCenter(new THREE.Vector3());
        textMesh.position.set(-center.x, 0, center.z * 2);
        textMesh.rotation.set(-Math.PI * 0.5, 0, 0);
        textMesh.castShadow = true;

        // 文字オブジェクトのグループ作成
        var rouletteGroupchild = new THREE.Group();
        rouletteGroupchild.add(textMesh);

        // 文字オブジェクトの回転的位置
        var txtrad = -(Math.PI * 2 * i / lunch.length + Math.PI * 1.5 + Math.PI * 1 / lunch.length);
        rouletteGroupchild.position.set(han * Math.cos(txtrad), 40, han * Math.sin(-txtrad));

        // 文字オブジェクト自体の回転
        var txtrad2 = -(Math.PI * 2 * i / lunch.length + Math.PI * 1 / lunch.length);
        rouletteGroupchild.rotation.set(0, txtrad2, 0);

        // 追加
        rouletteGroup.add(rouletteGroupchild);
      });
    })(i, color, rouletteGroup);
  }
  scene.add(rouletteGroup);
}

// ページの読み込みを待つ
window.addEventListener('load', setThree);

// 画面サイズ変更時の処理
function onResize() {
  // サイズを取得
  const width = $("#myCanvas").parent().width() - 20;
  const height = $("#myCanvas").height();
  // レンダラーのサイズを調整する
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  // カメラのアスペクト比を正す
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
// リサイズイベント発生時に実行
window.addEventListener('resize', onResize);