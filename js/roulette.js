// ページの読み込みを待つ
window.addEventListener('load', init);
// リサイズイベント発生時に実行
window.addEventListener('resize', onResize);


var ORIGIN = new THREE.Vector3(0, 0, 0);
var render;
var camera;
var scene;
var rouletteGroup;
var gameStatus = 0;
var speed = 0;
var speedMax = 0.196;
var speedPlus = 0.001;
var speedCurve = 0;
var speedCurveCurvePlus = 0.00003;
var speedCurveCurveMinus = 0.0000027;

function init() {
  setThree()
  setJquery()
}

function setThree() {
  // canvas 要素の参照を取得する
  const canvas = document.querySelector('#myCanvas');
  var selectObj = null;

  // サイズを指定
  const width = $("#myCanvas").parent().width() - 20;
  const height = 700;
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
  addFloorAndGrid(scene, ereaSize);

  // 針を作成
  addCone(scene, ereaSize);

  // 初期状態のルーレット作成
  gameStart()

  tick();

  // 毎フレーム実行
  function tick() {
    renderer.render(scene, camera);
    if (gameStatus === 1) {
      speedCurve = Math.max(0, Math.min(speedCurve + speedCurveCurvePlus, speedPlus))
      speed = Math.max(0, Math.min(speed + speedCurve, speedMax))
      rouletteGroup.rotation.y = rouletteGroup.rotation.y + Math.PI * speed
    } else if (gameStatus === 2) {
      speedCurve = Math.max(speedPlus / 80, Math.min(speedCurve - speedCurveCurveMinus, speedPlus))
      speed = Math.max(0, Math.min(speed - speedCurve, speedMax))
      rouletteGroup.rotation.y = rouletteGroup.rotation.y + Math.PI * speed
      if (speed === 0) {
        gameEnd()
      }
    }
    requestAnimationFrame(tick);
  }
}

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

function gameStart() {
  // データ作り
  var lunch = [];
  var inputList = $("#input_pluralBox").find(".form-control");
  if (inputList.length === 0) {
    console.log("inputList.length = 0");
  }
  for (var i = 0; i < inputList.length; i++) {
    if (inputList[i].value.match(/^\s*$/g)) {
      inputList[i].value = "陳麻婆豆腐"
    }
    lunch.push(inputList[i].value);
  }

  // 色のランダム生成
  var color = [];
  var memo = Math.random() * 360;
  for (var j in lunch) {
    if (lunch.length > 2 && j == lunch.length - 1) {
      var avg = (color[0] + color[j - 1]) / 2;
      const h = Math.abs(color[0] - color[j - 1]) > 180 ? avg : avg + 180;
      inputList[j].style.backgroundColor = `hsl(${h}, 95%, 80%)`;
      color.push(h);
    } else {
      const h = (memo + 90 + Math.random() * 180) % 360;
      inputList[j].style.backgroundColor = `hsl(${h}, 95%, 80%)`;
      color.push(h);
      memo = h;
    }
  }

  // 球体づくり
  addCylinders(lunch, color);
}


function addCylinders(lunch, color) {
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

      // 文字の追加
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
            color: 0xFFFFFF,
            overdraw: 0.5
          }),
          new THREE.MeshBasicMaterial({
            color: 0xAAAAAA,
            overdraw: 0.5
          })
        ];
        var textMesh = new THREE.Mesh(textGeometry, materials);

        // 文字オブジェクトのサイズ取得と微調整
        textMesh.geometry.computeBoundingBox();
        var box = textMesh.geometry.boundingBox.clone();
        var center = box.getCenter();
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
        var txtrad2 = Math.PI * 2 * (i + 1) / lunch.length + Math.PI;
        var txtrad2 = -(Math.PI * 2 * i / lunch.length + Math.PI * 1 / lunch.length)
        rouletteGroupchild.rotation.set(0, txtrad2, 0);

        // 追加
        rouletteGroup.add(rouletteGroupchild);
      });
    })(i, color, rouletteGroup);
  }
  scene.add(rouletteGroup);
}

function addLight(scene, ereaSize) {
  const spotLight = new THREE.PointLight(0xFFFFFF, 3.4, 6000, 2.0);
  spotLight.position.set(ereaSize * 0.2, ereaSize * 0.2, ereaSize * 0.2);
  spotLight.castShadow = true; // 影を落とす設定
  scene.add(spotLight);

  // 環境光
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2);
  scene.add(ambientLight);
}

function addFloorAndGrid(scene, ereaSize) {
  const floorGeometry = new THREE.PlaneGeometry(ereaSize, ereaSize);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x66BBDD,
    roughness: 0.03,
    metalness: 0.75
  })
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

function addCone(scene, ereaSize) {
  var geometry = new THREE.ConeBufferGeometry(3, 40, 30);
  var material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    roughness: 0.03,
    metalness: 0.75
  });
  var cone = new THREE.Mesh(geometry, material);
  cone.position.set(0, 65, -80);
  cone.rotation.set(-Math.PI * 1.2, 0, 0);
  scene.add(cone);
}

function gameEnd() {
  // 判定
  var list = $("#input_pluralBox").find(".form-control");
  var quo = rouletteGroup.rotation.y / (Math.PI * 2)
  var r = Math.floor((quo - Math.floor(quo)) * list.length);
  gameStatus = 0;

  // 入力欄
  for (var i in list) {
    list[i].disabled = false;
  }
  // ボタン設定
  $("#button").prop("disabled", false);
  $("#button").removeClass("dark");
  $("#button").val("START");

  // alert
  swal({
    title: list[r].value,
  });
}

function getPlaneOfCamera(position, camera) {
  // カメラ自体の単位法線ベクトル
  var vec = new THREE.Vector3(0, 0, 1);
  //変換前のベクトル 
  vec.applyEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'XYZ'));
  //変換後のベクトル　(0, 0, 1)を移動してるのでもちろん長さは1になります！！

  // 法線ベクトルvecを持つ平面で、Oを通るもの。（Oとの距離が0のもの）
  var plane = new THREE.Plane(new THREE.Vector3(vec.x, 0, vec.z), 0);
  // 対象の物体との距離を計算する
  var distance = plane.distanceToPoint(new THREE.Vector3(position.x, position.y, position.z));
  // 法線ベクトルvecを持つ平面で、対象の中心を通るもの。（物体との距離が-distanceのもの）
  var plane2 = new THREE.Plane(vec, -distance);
  return plane2;
}

function setJquery() {
  $(document).ready(function() {
    $("#button").on('click', gameSet);
  })
  $(document).on("click", ".add", function() {
    if (gameStatus !== 0) {
      return;
    }
    var count = $(this).parent().parent().children().length;
    if (count < 8) {
      var newParent = $(this).parent().clone(true);
      newParent.prop("id", "input_plural-" + (count + 1));
      var newControl = newParent.find(".form-control")[0];
      newControl.disabled = false;
      newControl.value = "";
      newControl.style.backgroundColor = "#FFFFFF";
      newParent.insertAfter($(this).parent());
    }
  });
  $(document).on("click", ".del", function() {
    if (gameStatus !== 0) {
      return;
    }
    var target = $(this).parent();
    if (target.parent().children().length > 1) {
      target.remove();
    }
  });
}

function gameSet() {
  if (gameStatus === 0) {
    gameStart()
    var inputList = $("#input_pluralBox").find(".form-control");
    for (var i = 0; i < inputList.length; i++) {
      inputList[i].disabled = true;
    }
    this.value = "STOP";
  } else if (gameStatus === 1) {
    this.disabled = true;
    this.classList.add("dark");
  }
  gameStatus++;
}