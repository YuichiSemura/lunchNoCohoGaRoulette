<script setup lang="ts">
import draggable from "vuedraggable";
import { TresCanvas, useRenderLoop } from '@tresjs/core';
import { computed, reactive, ref, watchEffect, onMounted, onUnmounted } from 'vue';
import { BasicShadowMap, SRGBColorSpace, NoToneMapping, Vector3, Quaternion, Euler } from 'three';
import { OrbitControls, Text3D, Stars } from '@tresjs/cientos';
import { useControls } from '@tresjs/leches';

// 色の設定
const darkMode = ref(Boolean(JSON.parse(localStorage.getItem("darkmode") ?? 'true')));
const colorTheme = computed(() => {
  return darkMode.value ? 'dark' : 'light';
});
watchEffect(()=>{
  localStorage.setItem("darkmode", String(darkMode.value));
})

const starRotationY = ref(0);
const mirrorBallRotationY = ref(0);
const mirrorBallRotationX = ref(0);
const colorTime = ref(0);

// 結果Modal用のアニメーション変数
const resultModalAnimation = ref(false);
const fireworksAnimation = ref(false);
const confettiAnimation = ref(false);

// カラフルなライトの色計算
const getColorfulLight = (offset: number) => {
  const hue = (colorTime.value * 0.001 + offset) % 1;
  return `hsl(${hue * 360}, 100%, 70%)`;
};

// 球面座標でタイルの位置と回転を計算
const getMirrorTileTransform = (index: number, total: number) => {
  const ballRadius = originalAreaSize * 0.164;

  const golden_angle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radius = Math.sqrt(1 - y * y);

  const theta = golden_angle * index;

  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;

  const position = [x * ballRadius, y * ballRadius, z * ballRadius];

  // 法線ベクトル
  const normal = new Vector3(x, y, z).normalize();

  // デフォルトの面の向きを z+ と仮定
  const defaultDirection = new Vector3(0, 0, 1);

  // タイルを球面に沿って向けるためのクォータニオン
  const quaternion = new Quaternion().setFromUnitVectors(defaultDirection, normal);

  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ');

  return {
    position: position as [number, number, number],
    rotation: [euler.x, euler.y, euler.z] as [number, number, number],
  };
};

const colorThemeMap = {
  light: {
    clearColor: '#DDDDDD',
    floorColor: '#77FFFF',
    hslForCylinder: '45%, 55%',
    hslForTextField: '75%, 85%',
    rouletteBtnColorStart: 'blue-darken-1',
    rouletteBtnColorStop: 'red-darken-4',
    rouletteBtnColorDisabled: 'blue-grey',
    appBarColor: 'light-blue-darken-2',
    drawerColor: 'white',
    helpBtnColor: 'green-lighten-1',
    cohoBtnColor: 'pink-lighten-2',
    dialogColor: 'white',
  },
  dark: {
    clearColor: '#121B35',
    floorColor: '#121B35',
    hslForCylinder: '45%, 55%',
    hslForTextField: '25%, 85%',
    rouletteBtnColorStart: 'blue-darken-4',
    rouletteBtnColorStop: 'pink-accent-4',
    rouletteBtnColorDisabled: 'blue-darken-4',
    appBarColor: 'grey-darken-4',
    drawerColor: 'grey-darken-3',
    helpBtnColor: 'grey-darken-1',
    cohoBtnColor: 'grey-darken-1',
    dialogColor: 'grey-darken-3',
  },
} as const;

const clearColor = computed(() => {
  return colorThemeMap[colorTheme.value].clearColor;
});
const floorColor = computed(() => {
  return colorThemeMap[colorTheme.value].floorColor;
});
const hslForCylinder = computed(() => {
  return colorThemeMap[colorTheme.value].hslForCylinder;
});
const hslForTextField = computed(() => {
  return colorThemeMap[colorTheme.value].hslForTextField;
});
const rouletteBtnColorStart = computed(() => {
  return colorThemeMap[colorTheme.value].rouletteBtnColorStart;
});
const rouletteBtnColorStop = computed(() => {
  return colorThemeMap[colorTheme.value].rouletteBtnColorStop;
});
const rouletteBtnColorDisabled = computed(() => {
  return colorThemeMap[colorTheme.value].rouletteBtnColorDisabled;
});
const appBarColor = computed(() => {
  return colorThemeMap[colorTheme.value].appBarColor;
});
const drawerColor = computed(() => {
  return colorThemeMap[colorTheme.value].drawerColor;
});
const helpBtnColor = computed(() => {
  return colorThemeMap[colorTheme.value].helpBtnColor;
});
const cohoBtnColor = computed(() => {
  return colorThemeMap[colorTheme.value].cohoBtnColor;
});
const dialogColor = computed(() => {
  return colorThemeMap[colorTheme.value].dialogColor;
});

/* Three.js系の設定 */
const state = reactive({
  clearColor: clearColor,
  shadows: true,
  alpha: false,
  shadowMapType: BasicShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: NoToneMapping,
});

const areaSize = 600;
const originalAreaSize = 300; // ルーレット、文字、カメラ用の元のサイズ
type ThreeNumber = [number, number, number];
const cameraInitialPosition: ThreeNumber = [originalAreaSize * 0.3, originalAreaSize * 0.6, originalAreaSize * 0.8];

const pointLightIntensity = areaSize * 4;
const pointLightDistance = areaSize * 3;
const pointLightDecay = 1.0;

// 箱作り
const floorRoughness = 0.03;
const floorMetalness = 0.75;
const floorConfigList: { position: ThreeNumber; rotation: ThreeNumber }[] = [
  { position: [0, -areaSize / 2, 0], rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, 0, -areaSize / 2], rotation: [0, 0, 0] },
  { position: [-areaSize / 2, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [0, areaSize / 2, 0], rotation: [Math.PI / 2, 0, 0] },
  { position: [0, 0, areaSize / 2], rotation: [0, Math.PI, 0] },
  { position: [areaSize / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] },
];

// 初期リスト
var initList = ['陳麻婆豆腐', 'McDonald', '五右衛門'];

// 接待モード関連
const vipMode = ref<boolean>(false);
const vipTargetIndex = ref<number>(-1);

// URLのパース
const getParam = (name: string, url: string) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

// URLからの情報取得処理
const setParameter = () => {
  const query = getParam('list', location.href);
  return query == null ? initList.map((v)=> v) : query.split(',');
};

// VIPモード設定の取得
const setupVipMode = () => {
  const vipQuery = getParam('vip', location.href);
  if (vipQuery && vipQuery.trim() !== '') {
    const targetName = decodeURIComponent(vipQuery.trim());
    const targetIndex = lunchList.value.findIndex(item => item === targetName);
    if (targetIndex !== -1) {
      vipMode.value = true;
      vipTargetIndex.value = targetIndex;
      console.log('🎯 VIPモードが有効になりました'); // デバッグ用
    } else {
      vipMode.value = false;
      vipTargetIndex.value = -1;
    }
  } else {
    vipMode.value = false;
    vipTargetIndex.value = -1;
  }
};

// 色のランダム生成
const initColors = (length: number) => {
  const colors: number[] = [];
  let memo = Math.random() * 360;

  for (var i = 0; i < length; i++) {
    if (length > 2 && i == length - 1) {
      var avg = (colors[0] + colors[i - 1]) / 2;
      const h = Math.abs(colors[0] - colors[i - 1]) > 180 ? avg : avg + 180;
      colors.push(h);
    } else {
      const h = (memo + 90 + Math.random() * 180) % 360;
      colors.push(h);
      memo = h;
    }
  }
  return colors;
};

// ルーレット系
const lunchList = ref<string[]>(setParameter());
const colorList = ref<number[]>(initColors(lunchList.value.length));
const lunchViewList = ref<string[]>(setParameter());
const colorViewList = ref<number[]>(initColors(lunchList.value.length));

// drag
const dragOptions = {
  animation: 200,
  group: "lunch",
  disabled: false,
  ghostClass: "ghost"
}

// 候補数の最大値
const cohoMax = 10;

const isPrepareStatus = computed(() => {
  return gameStatus.value === 0;
});

const hslMapForCylinder = (h: number) => {
  return `hsl(${h}, ${hslForCylinder.value})`;
};

const hslMapForTextField = (ind: number) => {
  return ind < colorViewList.value.length 
    ? `hsl(${colorViewList.value[ind]}, ${hslForTextField.value})` 
    : darkMode.value 
    ? '#CCCCCC'
    : '#FFFFFF';
};

const addLunch = () => {
  if (lunchViewList.value.length >= cohoMax) {
    return;
  }
  lunchViewList.value.push('');
};

const disabledAddLunch = computed(() => {
  return lunchViewList.value.length === cohoMax || !isPrepareStatus.value;
});

const removeLunch = (index: number) => {
  if (disabledRemoveLunch.value) {
    return;
  }
  lunchViewList.value.splice(index, 1);
  colorViewList.value.splice(index, 1);
};

const disabledRemoveLunch = computed(() => {
  return lunchViewList.value.length === 1 || !isPrepareStatus.value;
});

const lunchColorList = computed(() => {
  return lunchList.value.map((lunch, index) => {
    return {
      lunch: lunch,
      color: colorList.value.length > index ? colorList.value[index] : 0,
    };
  });
});

const getRad = (i: number, length: number) => {
  return (Math.PI * 2 * i) / length + Math.PI * (1 + 2 / length);
};

const rouletteGroupRotationY = ref<number>(0);

// Game系
useControls('fpsgraph');

const { onLoop } = useRenderLoop();
const gameStatus = ref(0);
const result = ref('');
// STOPを押した時のrotationYから、完全に停止する位置を予測するための数値 rotationConstant
const rotationConstant = 100.378406034;

const rouletteBtnClick = () => {
  if (gameStatus.value === 0) {
    gameStatus.value = 1;
    gameStart();
  } else if (gameStatus.value === 1 && speed.value >= speedMax.value) {
    // 最高速度に到達している時のみSTOPを受け付ける
    gameStatus.value = 2;
    
    // VIPモードの場合は、目標位置に向けて角度を調整
    if (vipMode.value && vipTargetIndex.value !== -1) {

      const targetQuo = (Math.random() + vipTargetIndex.value) / lunchList.value.length;
      const targetRotation = Math.PI * 2 * targetQuo;

      // 現在の回転値を調整
      rouletteGroupRotationY.value = targetRotation - rotationConstant;
    }
  }
};

const gameStart = () => {
  rouletteGroupRotationY.value = 0;
  lunchViewList.value = lunchViewList.value.map((v) => (v.match(/^\s*$/g) ? '陳麻婆豆腐' : v));
  lunchList.value = lunchViewList.value.map((v) => (v.match(/^\s*$/g) ? '陳麻婆豆腐' : v));
  const colors = initColors(lunchList.value.length);
  colorList.value = colors;
  colorViewList.value = colors.map((v) => v);
};

const rouletteBtnColor = computed(() => {
  return gameStatus.value === 0
    ? rouletteBtnColorStart
    : gameStatus.value === 1
      ? (speed.value >= speedMax.value ? rouletteBtnColorStop : rouletteBtnColorDisabled)
      : rouletteBtnColorDisabled;
});

const rouletteBtnDisabled = computed(() => {
  return gameStatus.value === 2 || (gameStatus.value === 1 && speed.value < speedMax.value);
});

const rouletteBtnTitle = computed(() => {
  if (gameStatus.value === 0) {
    return 'START';
  } else if (gameStatus.value === 1 && speed.value < speedMax.value) {
    return '加速中...';
  } else {
    return 'STOP';
  }
});

const gameEnd = () => {
  var quo = rouletteGroupRotationY.value / (Math.PI * 2);
  var index = Math.floor((quo - Math.floor(quo)) * lunchList.value.length);
  result.value = lunchList.value[index];
  gameStatus.value = 0;
  dialog.value = true;
  
  // ダークモード時の派手な演出を開始
  if (darkMode.value) {
    resultModalAnimation.value = true;
    fireworksAnimation.value = true;
    confettiAnimation.value = true;
    
    // 6秒後にアニメーションを停止
    setTimeout(() => {
      fireworksAnimation.value = false;
      confettiAnimation.value = false;
    }, 6000);
  }
};

const drawer = ref(true);
const dialog = ref(false);
const dialogHelp = ref(false);
const dialogVip = ref(false); // VIP設定ダイアログ

// キーボードショートカット関連
const vipKeyPressCount = ref<number>(0);
let vipKeyTimer: number | null = null;

// ダークモード連続タップ関連
const darkModeClickCount = ref<number>(0);
let darkModeClickTimer: number | null = null;
const darkModeClickThreshold = 5; // 5回タップ
const darkModeClickTimeout = 2000; // 2秒以内

// キーボードショートカットの処理
const handleKeydown = (event: KeyboardEvent) => {
  // Shift + Ctrl + V で隠し設定を開く（2回押し）
  if (event.shiftKey && event.ctrlKey && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    
    vipKeyPressCount.value++;
    
    // タイマーをクリア
    if (vipKeyTimer) {
      clearTimeout(vipKeyTimer);
    }
    
    // 2回押しでダイアログを開く
    if (vipKeyPressCount.value === 2) {
      dialogVip.value = true;
      vipKeyPressCount.value = 0;
      console.log('🔒 VIP設定ダイアログを開きました');
      return;
    }
    
    // 1秒以内に2回目が押されなかった場合はリセット
    vipKeyTimer = setTimeout(() => {
      vipKeyPressCount.value = 0;
      if (vipMode.value) {
        vipMode.value = false;
        vipTargetIndex.value = -1;
        console.log('🔓 接待モードが自動的に解除されました（タイムアウト）');
      }
    }, 1000);
  }
  
  // Shift + Ctrl + 数字キー でVIPターゲットを直接設定
  if (event.shiftKey && event.ctrlKey) {
    let targetIndex = -1;
    
    if (event.key >= '1' && event.key <= '9') {
      targetIndex = parseInt(event.key) - 1; // 1-9 → 0-8
    } else if (event.key === '0') {
      targetIndex = 9; // 0 → 9 (10番目)
    }
    
    if (targetIndex !== -1 && targetIndex < lunchViewList.value.length) {
      event.preventDefault();
      vipMode.value = true;
      vipTargetIndex.value = targetIndex;
      console.log(`🎯 接待モードが設定されました: ${lunchViewList.value[targetIndex]} (${targetIndex + 1}番)`);
    }
  }
};

// 初期化時にVIPモードをセットアップ
setupVipMode();

// コンポーネントのライフサイクル管理
onMounted(() => {
  // キーボードショートカットの設定
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  // イベントリスナーのクリーンアップ
  window.removeEventListener('keydown', handleKeydown);
  
  // タイマーのクリーンアップ
  if (vipKeyTimer) {
    clearTimeout(vipKeyTimer);
  }
  if (darkModeClickTimer) {
    clearTimeout(darkModeClickTimer);
  }
});

// VIP設定の適用
const applyVipSettings = (target: string) => {
  if (target.trim() !== '') {
    const targetIndex = lunchViewList.value.findIndex(item => item === target.trim());
    if (targetIndex !== -1) {
      vipMode.value = true;
      vipTargetIndex.value = targetIndex;
      console.log(`🎯 接待モードが設定されました: ${target.trim()}`);
    } else {
      vipMode.value = false;
      vipTargetIndex.value = -1;
      console.log('❌ 指定されたランチが見つからないため、接待モードを解除しました');
    }
  } else {
    vipMode.value = false;
    vipTargetIndex.value = -1;
    console.log('🔓 接待モードが解除されました');
  }
};

// VIP設定のリセット
const resetVipSettings = () => {
  vipMode.value = false;
  vipTargetIndex.value = -1;
  console.log('🔄 接待モードがリセットされました');
  dialogVip.value = false;
};

// ダークモード連続タップ検出ロジック
const handleDarkModeClick = () => {
  darkModeClickCount.value++;
  
  // タイマーをクリア
  if (darkModeClickTimer) {
    clearTimeout(darkModeClickTimer);
  }
  
  // 5回タップで接待ダイアログを開く
  if (darkModeClickCount.value === darkModeClickThreshold) {
    dialogVip.value = true;
    darkModeClickCount.value = 0;
    console.log('🌙 ダークモード5回タップで接待ダイアログを開きました');
    return;
  }
  
  // 2秒以内にタップされなかった場合はリセット
  darkModeClickTimer = setTimeout(() => {
    darkModeClickCount.value = 0;
  }, darkModeClickTimeout);
};

// ルーレットの速度
const speed = ref(0);
// ルーレットの最高速度
const speedMax = ref(0.196);
// ルーレットの加速度
const speedPlus = ref(0.001);
// ルーレットの加速度の微分
const speedCurve = ref(0);
// ルーレットの加速度の微分の加速時の微分
const speedCurveCurvePlus = 0.00003;
// ルーレットの加速度の微分の減速時の微分
const speedCurveCurveMinus = 0.0000027;
onLoop(({ delta }) => {
  starRotationY.value += 0.001 * delta;
  
  // ミラーボールの回転速度：基本速度 + ルーレット回転速度に比例
  const rouletteSpeedMultiplier = speed.value * 20; // ルーレット速度を20倍に増幅（2倍に変更）
  mirrorBallRotationY.value += (0.5 + rouletteSpeedMultiplier) * delta;
  mirrorBallRotationX.value += (0.3 + rouletteSpeedMultiplier * 0.6) * delta;
  
  colorTime.value += delta;
  if (gameStatus.value === 1) {
    speedCurve.value = Math.max(0, Math.min(speedCurve.value + speedCurveCurvePlus, speedPlus.value));
    speed.value = Math.max(0, Math.min(speed.value + speedCurve.value, speedMax.value));
    rouletteGroupRotationY.value += Math.PI * speed.value;
  } else if (gameStatus.value === 2) {
    // 通常の減速処理
    speedCurve.value = Math.max(
      speedPlus.value / 80,
      Math.min(speedCurve.value - speedCurveCurveMinus, speedPlus.value),
    );
    speed.value = Math.max(0, Math.min(speed.value - speedCurve.value, speedMax.value));
    rouletteGroupRotationY.value += Math.PI * speed.value;
    if (speed.value === 0) {
      gameEnd();
    }
  }
});

const url_query = computed(() => {
  return lunchViewList.value.map(encodeURIComponent).join(',');
});

const url = computed(() => {
  return location.origin + location.pathname + '?list=' + url_query.value;
});

watchEffect(() => {
  // URLの書き換え
  history.replaceState(null, document.title, location.pathname + '?list=' + url_query.value);
});
</script>

<template>
  <v-app>
    <TresCanvas v-bind="state" z-index="200">
      <TresPerspectiveCamera :args="[45, 1, 1, areaSize * 30]" :position="cameraInitialPosition" />
      <OrbitControls />
      <TresAmbientLight :intensity="2" color="white" />
      <TresPointLight
        :intensity="pointLightIntensity"
        :distance="pointLightDistance"
        :decay="pointLightDecay"
        color="white"
        :position="[areaSize * 0.2, areaSize * 0.2, areaSize * 0.2]"
        :cast-shadow="true"
      />
      <TresMesh v-for="item in floorConfigList" :position="item.position" :rotation="item.rotation">
        <TresPlaneGeometry :args="[areaSize, areaSize]" />
        <TresMeshStandardMaterial 
          :color="floorColor" 
          :roughness="darkMode ? 0.8 : floorRoughness" 
          :metalness="darkMode ? 0.2 : floorMetalness" 
        />
      </TresMesh>
      <TresGroup :rotation="[0, rouletteGroupRotationY, 0]">
        <TresMesh v-for="(item, index) in lunchColorList" :position="[0, 0, 0]">
          <TresCylinderGeometry
            :args="[
              originalAreaSize * 0.25,
              originalAreaSize * 0.25,
              originalAreaSize * 0.1,
              40,
              1,
              false,
              -getRad(index, lunchColorList.length),
              (Math.PI * 2) / lunchColorList.length,
            ]"
          />
          <TresMeshStandardMaterial
            :color="hslMapForCylinder(item.color)"
            :roughness="0.04"
            :metalness="0.7"
            :side="2"
          />
        </TresMesh>

        <TresGroup
          v-for="(_, i) in lunchList"
          :key="i"
          :rotation="[0, -((Math.PI * 2 * i) / lunchList.length + (Math.PI * 1) / lunchList.length), 0]"
        >
          <Suspense>
            <Text3D
              :text="String(i + 1)"
              font="./json/helvetiker_bold.typeface.json"
              :size="12"
              :height="5"
              :curveSegments="12"
              center
              :position="[0, originalAreaSize * 0.05, -originalAreaSize * 0.16]"
              :rotation="[-Math.PI * 0.5, 0, 0]"
            >
              <TresMeshStandardMaterial />
            </Text3D>
          </Suspense>
        </TresGroup>
      </TresGroup>
      <TresMesh :position="[0, originalAreaSize * 0.11, -originalAreaSize * 0.23]" :rotation="[-Math.PI * 1.2, 0, 0]">
        <TresConeGeometry :args="[3, originalAreaSize * 0.1, originalAreaSize * 0.075]"></TresConeGeometry>
        <TresMeshStandardMaterial :color="'#ffff00'" :roughness="0.03" :metalness="0.7" />
      </TresMesh>
      <Stars
        v-if="darkMode"
        :rotation="[0, starRotationY, 0]"
        :radius="areaSize * 4"
        :depth="areaSize * 1"
        :count="500"
        :size="areaSize * 0.012"
        :size-attenuation="true"
      />
      <!-- ミラーボール（ダークモード時のみ表示） -->
      <TresGroup 
        v-if="darkMode" 
        :position="[0, areaSize * 0.26, 0]"
        :rotation="[mirrorBallRotationX, mirrorBallRotationY, 0]"
      >
        
        <!-- メインのミラーボール -->
        <TresMesh>
          <TresSphereGeometry :args="[originalAreaSize * 0.16, 32, 32]" />
          <TresMeshStandardMaterial 
            color="#C0C0C0" 
            :metalness="1.0" 
            :roughness="0.0"
            :env-map-intensity="2.0"
          />
        </TresMesh>
        
        <!-- ミラーの小さなタイル -->
        <TresMesh 
          v-for="i in 250" 
          :key="i"
          :position="getMirrorTileTransform(i, 250).position"
          :rotation="getMirrorTileTransform(i, 250).rotation"
        >
          <TresCircleGeometry :args="[originalAreaSize * 0.02, 16]" />
          <TresMeshStandardMaterial 
            :color="getColorfulLight(i * 0.004)"
            :metalness="1.0" 
            :roughness="0.0"
            :emissive="getColorfulLight(i * 0.004)"
            :emissive-intensity="1.3"
          />
        </TresMesh>
      </TresGroup>
      
      <!-- 部屋全体を照らすディスコライト（ダークモード時のみ） -->
      <TresGroup v-if="darkMode" :rotation="[0, rouletteGroupRotationY * 0.3, 0]">
        <!-- 部屋の各角からの拡散光 -->
        <TresPointLight
          :position="[areaSize * 0.4, areaSize * 0.45, areaSize * 0.4]"
          :color="getColorfulLight(0.1)"
          :intensity="areaSize * 1.5"
          :distance="areaSize * 2"
          :decay="0.8"
        />
        <TresPointLight
          :position="[-areaSize * 0.4, areaSize * 0.45, areaSize * 0.4]"
          :color="getColorfulLight(0.3)"
          :intensity="areaSize * 1.5"
          :distance="areaSize * 2"
          :decay="0.8"
        />
        <TresPointLight
          :position="[areaSize * 0.4, areaSize * 0.45, -areaSize * 0.4]"
          :color="getColorfulLight(0.6)"
          :intensity="areaSize * 1.5"
          :distance="areaSize * 2"
          :decay="0.8"
        />
        <TresPointLight
          :position="[-areaSize * 0.4, areaSize * 0.45, -areaSize * 0.4]"
          :color="getColorfulLight(0.9)"
          :intensity="areaSize * 1.5"
          :distance="areaSize * 2"
          :decay="0.8"
        />
        
        <!-- 側面からの照明 -->
        <TresPointLight
          :position="[areaSize * 0.35, areaSize * 0.1, 0]"
          :color="getColorfulLight(0.15)"
          :intensity="areaSize * 1.2"
          :distance="areaSize * 2.5"
          :decay="1"
        />
        <TresPointLight
          :position="[-areaSize * 0.35, areaSize * 0.1, 0]"
          :color="getColorfulLight(0.45)"
          :intensity="areaSize * 1.2"
          :distance="areaSize * 2.5"
          :decay="1"
        />
        <TresPointLight
          :position="[0, areaSize * 0.1, areaSize * 0.35]"
          :color="getColorfulLight(0.7)"
          :intensity="areaSize * 1.2"
          :distance="areaSize * 2.5"
          :decay="1"
        />
        <TresPointLight
          :position="[0, areaSize * 0.1, -areaSize * 0.35]"
          :color="getColorfulLight(0.95)"
          :intensity="areaSize * 1.2"
          :distance="areaSize * 2.5"
          :decay="1"
        />
        
        <!-- 床からの間接照明 -->
        <TresPointLight
          :position="[areaSize * 0.2, -areaSize * 0.4, areaSize * 0.2]"
          :color="getColorfulLight(0.2)"
          :intensity="areaSize * 0.8"
          :distance="areaSize * 1.8"
          :decay="1.2"
        />
        <TresPointLight
          :position="[-areaSize * 0.2, -areaSize * 0.4, -areaSize * 0.2]"
          :color="getColorfulLight(0.8)"
          :intensity="areaSize * 0.8"
          :distance="areaSize * 1.8"
          :decay="1.2"
        />
      </TresGroup>
    </TresCanvas>
    <div class="navigation">
      <v-app-bar app :color="appBarColor">
        <v-app-bar-nav-icon class="mr-3" variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

        <div class="font-weight-bold d-flex d-sm-none">ランチの候補がルーレット ver2.2</div>
        <h2 class="font-weight-bold d-none d-sm-flex">ランチの候補がルーレット ver2.2</h2>
        <template v-slot:append>
          <span class="mr-2">
            <v-switch v-model="darkMode" inset hide-details @click="handleDarkModeClick">
              <template v-slot:prepend> <v-icon icon="mdi-brightness-7" /></template>
              <template v-slot:append>
                <v-icon icon="mdi-brightness-3" />
              </template>
            </v-switch>
          </span>
        </template>
      </v-app-bar>
      <v-navigation-drawer 
        v-model="drawer" 
        permanent
        :color="drawerColor"
        width="280"
        >
        <v-list-item class="mt-2 d-none d-sm-block"
          ><v-btn @click="dialogHelp = true" variant="elevated" block size="x-large" :color="helpBtnColor"
            >遊び方</v-btn
          ></v-list-item
        >
        <v-list-item class="my-2 d-none d-sm-block"
          ><v-btn
            @click="rouletteBtnClick"
            :disabled="rouletteBtnDisabled"
            variant="elevated"
            :color="rouletteBtnColor.value"
            block
            size="x-large"
            >{{ rouletteBtnTitle }}</v-btn
          ></v-list-item
        >
        <v-divider thickness="6"></v-divider>
        <v-list-item>
          <h3>候補</h3>
        </v-list-item>
        <draggable
          v-model="lunchViewList"
          v-bind="dragOptions"
          handle=".handle"
          item-key="."
          >
          <template #item="{ index }">
            <v-list-item class="list-group-item">
              <v-text-field
              v-model="lunchViewList[index]"
              density="compact"
              hide-details
              variant="outlined"
              :disabled="!isPrepareStatus"
              :bg-color="hslMapForTextField(index)"
              >
                <template v-slot:prepend>
                  <v-icon v-if="isPrepareStatus" icon="mdi-menu" class="handle"></v-icon>
                  <v-icon v-else icon="mdi-menu"></v-icon>
                </template>
                <template v-slot:append>
                  <v-btn
                    density="compact"
                    icon="mdi-delete"
                    color="red-lighten-2"
                    variant="text"
                    @click="removeLunch(index)"
                    :disabled="disabledRemoveLunch"
                  ></v-btn>
                </template>
              </v-text-field>
            </v-list-item>
          </template>
        </draggable>
        <v-list-item class="text-center">
          <v-btn
            density="compact"
            size="large"
            variant="flat"
            icon="mdi-plus"
            start
            @click="addLunch()"
            :disabled="disabledAddLunch"
          ></v-btn>
        </v-list-item>
        <v-divider thickness="6"></v-divider>
        <v-list-item>
          <h3>共有用URL</h3>
        </v-list-item>
        <v-list-item>
          <v-text-field v-model="url" density="compact" hide-details variant="outlined" />
        </v-list-item>
      </v-navigation-drawer>
      <v-main>
        <v-container>
          <v-row class="d-flex d-sm-none">
            <v-col class="py-1">
              <v-btn @click="dialogHelp = true" variant="elevated" size="x-large" block :color="helpBtnColor"
                >遊び方</v-btn
              >
            </v-col>

            <v-col class="py-1">
              <v-btn @click="drawer = !drawer" variant="elevated" size="x-large" :color="cohoBtnColor" block
                >ランチ候補</v-btn
              >
            </v-col>
            <v-col class="py-1">
              <v-btn
                @click="rouletteBtnClick"
                :disabled="rouletteBtnDisabled"
                variant="elevated"
                :color="rouletteBtnColor.value"
                block
                size="x-large"
                >{{ rouletteBtnTitle }}</v-btn
              >
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </div>
    <v-dialog v-model="dialog" width="20%" min-width="300">
      <v-card 
        class="pa-4 result-modal" 
        :class="{ 
          'dark-mode-celebration': darkMode && resultModalAnimation,
          'fireworks-bg': darkMode && fireworksAnimation 
        }"
        :color="dialogColor"
      >
        <!-- 花火エフェクト（ダークモード時のみ） -->
        <div v-if="darkMode && fireworksAnimation" class="fireworks-container">
          <div v-for="i in 8" :key="i" class="firework" :style="{ '--delay': i * 0.2 + 's' }"></div>
        </div>
        
        <!-- 紙吹雪エフェクト（ダークモード時のみ） -->
        <div v-if="darkMode && confettiAnimation" class="confetti-container">
          <div v-for="i in 30" :key="i" class="confetti" :style="{ 
            '--delay': '0s',
            '--color': `hsl(${(i * 72) % 360}, 70%, 60%)`,
            '--position': (Math.random() * 90 + 5) + '%',
            '--start-y': (Math.random() * 200 - 200) + 'px'
          }"></div>
        </div>
        
        <v-card-text>
          <h2 
            class="text-center result-text"
            :class="{ 
              'celebration-text': darkMode && resultModalAnimation,
              'pulse-animation': darkMode && resultModalAnimation 
            }"
          >
            {{ result }}
          </h2>
        </v-card-text>
        <template v-slot:actions>
          <v-btn 
            class="ms-auto celebration-btn" 
            :class="{ 'glow-effect': darkMode && resultModalAnimation }"
            variant="tonal" 
            text="Ok" 
            @click="dialog = false; resultModalAnimation = false"
          ></v-btn>
        </template>
      </v-card>
    </v-dialog>
    <v-dialog v-model="dialogHelp" width="25%" min-width="370">
      <v-card class="pa-5" :color="dialogColor">
        <v-card-title>
          <h3>遊び方</h3>
        </v-card-title>
        <v-card-text class="px-2 py-0">
          <v-list :bg-color="dialogColor">
            <v-list-item density="compact">
              <h4>1, 行きたいランチを入れましょう。</h4>
            </v-list-item>
            <v-list-item density="compact">
              <h4>2, スタートを押して開始します。</h4>
            </v-list-item>
            <v-list-item density="compact">
              <h4>3, ストップを押して祈ります。</h4>
            </v-list-item>
            <v-list-item density="compact">
              <h4>4, 止まったところでランチします。</h4>
            </v-list-item>
            <v-list-item density="compact">
              <h5>※1 マウスでカメラが動かせます。</h5>
            </v-list-item>
            <v-list-item density="compact">
              <h5>※2 候補は最大10個まで。</h5>
            </v-list-item>
          </v-list>
        </v-card-text>
        <template v-slot:actions>
          <v-btn class="ms-auto" variant="tonal" text="Ok" @click="dialogHelp = false"></v-btn>
        </template>
      </v-card>
    </v-dialog>
    
    <!-- VIP設定ダイアログ（隠し機能） -->
    <v-dialog v-model="dialogVip" width="30%" min-width="400" persistent>
      <v-card class="pa-5" :color="dialogColor">
        <v-card-title>
          <h3>🎯 接待モード設定</h3>
        </v-card-title>
        <v-card-text class="px-2 py-4">
          <v-alert 
            v-if="vipMode && vipTargetIndex !== -1" 
            type="success" 
            variant="tonal" 
            class="mb-4"
          >
            現在のターゲット: <strong>{{ lunchViewList[vipTargetIndex] }}</strong>
          </v-alert>
          
          <v-alert 
            v-if="!vipMode || vipTargetIndex === -1" 
            type="warning" 
            variant="tonal" 
            class="mb-4"
          >
            接待モードは現在<strong>無効</strong>です
          </v-alert>
          
          <v-select
            :model-value="vipTargetIndex !== -1 ? lunchViewList[vipTargetIndex] : ''"
            :items="lunchViewList"
            label="優先候補を選択"
            variant="outlined"
            density="comfortable"
            clearable
            hint="ここで選択した候補がルーレット結果として必ず選ばれます"
            persistent-hint
            @update:model-value="(value) => applyVipSettings(value || '')"
          ></v-select>
          
          <v-alert type="info" variant="tonal" class="mt-4">
            <div class="text-body-2">
              <strong>使用方法:</strong><br>
              • 候補を選択すると接待モードが有効になります<br>
              • 選択した候補が確実にルーレット結果として表示されます<br>
              • URLに ?vip=候補名 を追加しても設定可能です<br>
              • <kbd>Ctrl + Shift + V</kbd> を2回押しでこの画面を表示<br>
              • <kbd>Ctrl + Shift + [1-9,0]</kbd> で直接設定も可能<br>
              • ダークモードスイッチを2秒以内に5回タップでこの画面を表示
            </div>
          </v-alert>
        </v-card-text>
        
        <template v-slot:actions>
          <v-btn 
            variant="outlined" 
            @click="resetVipSettings"
            class="mr-2"
          >
            リセット
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn 
            variant="tonal" 
            @click="dialogVip = false"
          >
            閉じる
          </v-btn>
        </template>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.navigation {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.navigation > * {
  pointer-events: auto;
}

.flip-list-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform 0s;
}

.ghost{
  opacity: 0.5;
  background: #c8ebfb;
}

.list-group-item i {
  cursor: move;
}

/* 結果Modalの派手なアニメーション（ダークモード時） */
.result-modal {
  position: relative;
  overflow: hidden;
}

.dark-mode-celebration {
  animation: modal-entrance 0.6s ease-out;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6) !important;
}

@keyframes modal-entrance {
  0% { 
    transform: scale(0.3) rotate(-10deg);
    opacity: 0;
  }
  50% { 
    transform: scale(1.1) rotate(5deg);
  }
  100% { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.celebration-text {
  background: linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 2s ease-in-out infinite;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.pulse-animation {
  animation: pulse-celebration 1s ease-in-out infinite alternate;
}

@keyframes pulse-celebration {
  0% { transform: scale(1); }
  100% { transform: scale(1.1); }
}

/* 花火エフェクト */
.fireworks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.firework {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  animation: firework-explosion 1.5s ease-out infinite;
  animation-delay: var(--delay);
}

.firework:nth-child(1) { top: 20%; left: 20%; background: #FF6B6B; }
.firework:nth-child(2) { top: 30%; left: 80%; background: #4ECDC4; }
.firework:nth-child(3) { top: 60%; left: 15%; background: #45B7D1; }
.firework:nth-child(4) { top: 70%; left: 85%; background: #96CEB4; }
.firework:nth-child(5) { top: 40%; left: 50%; background: #FFEAA7; }
.firework:nth-child(6) { top: 80%; left: 60%; background: #FD79A8; }
.firework:nth-child(7) { top: 25%; left: 70%; background: #FDCB6E; }
.firework:nth-child(8) { top: 65%; left: 30%; background: #6C5CE7; }

@keyframes firework-explosion {
  0% {
    transform: scale(0);
    opacity: 1;
    box-shadow: 0 0 0 0 currentColor;
  }
  50% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 
      0 0 10px 5px currentColor,
      15px 0 10px 3px currentColor,
      -15px 0 10px 3px currentColor,
      0 15px 10px 3px currentColor,
      0 -15px 10px 3px currentColor,
      10px 10px 10px 2px currentColor,
      -10px -10px 10px 2px currentColor,
      10px -10px 10px 2px currentColor,
      -10px 10px 10px 2px currentColor;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
    box-shadow: 
      0 0 15px 8px currentColor,
      20px 0 15px 5px currentColor,
      -20px 0 15px 5px currentColor,
      0 20px 15px 5px currentColor,
      0 -20px 15px 5px currentColor,
      15px 15px 15px 3px currentColor,
      -15px -15px 15px 3px currentColor,
      15px -15px 15px 3px currentColor,
      -15px 15px 15px 3px currentColor;
  }
}

/* 紙吹雪エフェクト */
.confetti-container {
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 110%;
  pointer-events: none;
  z-index: 1;
}

.confetti {
  position: absolute;
  width: 6px;
  height: 12px;
  background: var(--color);
  animation: confetti-fall 6s linear infinite;
  animation-delay: var(--delay);
  top: var(--start-y);
  left: var(--position);
  
}

.confetti:nth-child(even) {
  width: 4px;
  height: 8px;
  border-radius: 50%;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(350px) rotate(720deg);
    opacity: 0;
  }
}

/* ボタンのグローエフェクト */
.glow-effect {
  animation: button-glow 2s ease-in-out infinite alternate;
}

@keyframes button-glow {
  0% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  }
  100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6);
  }
}

.fireworks-bg {
  background: radial-gradient(circle at 50% 50%, 
    rgba(255, 215, 0, 0.1) 0%, 
    rgba(255, 107, 107, 0.05) 25%, 
    rgba(78, 205, 196, 0.05) 50%, 
    rgba(69, 183, 209, 0.05) 75%, 
    transparent 100%);
  animation: background-pulse 2s ease-in-out infinite alternate;
}

@keyframes background-pulse {
  0% { background-size: 100% 100%; }
  100% { background-size: 110% 110%; }
}
</style>
