'use strict';

const fingerTipsIds = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const fingerTipsColors = ['#bada55', '#C2185B', '#FF5722', '#28B463', '#26C6DA'];

const h = 50, w = 50;
const appWidth = 1500;
const appHeight = 720;
const finger_colors = [[255, 0, 0], [0, 0, 255], [0, 255, 0], [255, 255, 0], [0, 255, 255]];

let gestureMode = false;
let visualizerMode = false;

let counter = 1;
let frequency = 65;

var ControlsEnum = Object.freeze({"pause": 0, "play": 1, "open_tab": 2, "none": 3})
let prevCommand = ControlsEnum.none;


class ControlsManager {

  constructor() { }

  triggerControls(response) {
    if (response && response.prediction[ControlsEnum.pause] === 1) {
      this.pauseVideo();
      prevCommand = ControlsEnum.pause;
    }

    if (response && response.prediction[ControlsEnum.play] === 1) {
      this.playVideo();
      prevCommand = ControlsEnum.play;
    }

    if (response && response.prediction[ControlsEnum.open_tab] === 1 
      && prevCommand !== ControlsEnum.open_tab) {
      this.openPage();
      prevCommand = ControlsEnum.open_tab;
    }

    if (response && response.prediction[ControlsEnum.none] === 1) {
      prevCommand = ControlsEnum.none;
    }
  }

  playVideo() {
    $('video').get(0) && $('video').get(0).play();
  }
  
  pauseVideo() {
    $('video').get(0) && $('video').get(0).pause();
  }
  
  openPage() {
    chrome.storage.sync.get({
      openTabUrl: 'https://www.youtube.com'
  
    }, function(items) {
      console.log(items.openTabUrl);
      window.open(items.openTabUrl, '_blank');
    });
  }

}

class CoordinateExtractor {

  constructor() { }

  drawFinger(finger, ibox, newFrame, finger_color) {
    finger.bones.forEach(bone => {
      const direction = bone.direction();
      let center = bone.center();
      let start = bone.prevJoint[0] < bone.nextJoint[0] ? bone.prevJoint : bone.nextJoint;
      let end = bone.prevJoint[0] > bone.nextJoint[0] ? bone.prevJoint : bone.nextJoint;

      if (end[0] !== start[0]) {
          for(let x = 1; x <= Math.floor(end[0] - start[0]); x++) { 
              let z = x * direction[2] / direction[0] + start[2];
              let y = x * direction[1] / direction[0] + start[1];

              let point = ibox.normalizePoint([x + start[0], y, z]);
              newFrame.push({x : point[0], y : point[2], color: finger_color});
          }
      }

      center = ibox.normalizePoint(center);
      start = ibox.normalizePoint(start);
      end = ibox.normalizePoint(end);

      newFrame.push({x: start[0], y: start[2], color: finger_color});
      newFrame.push({x: end[0], y: end[2], color: finger_color});
      newFrame.push({x: center[0], y: center[2], color: finger_color});
    });
  }

}

class VisualizerManager {

  constructor() { }

  generateFingerTipsCursor(id, color) {
    var div = document.createElement( 'div' );
    div.id = id;
    div.innerHTML = `<svg height="30" width="30">
      <circle cx="15" cy="15" r="13" stroke="#1B2631" stroke-width="2" fill="${color}"/>
      <text x="11" y="19" fill="white" style="font-weight: bold">${id[0]}</text>
    </svg> `;
    div.style.zIndex = 9000000;
    div.style.position = "absolute";
    div.style.opacity = 0.7;
    div.style.top = "50px";
    div.style.left = "50px";
  
    document.body.appendChild( div );
  }

  removeCursors() {
    fingerTipsIds.forEach(fingerId => {
      const div = document.getElementById(fingerId);

      if (div) {
        div.remove();
      }
    });
  }

  updateCursorsPosition(frame) {
    const iBox = frame.interactionBox;
    const fingers = frame.hands[0].fingers;
    const scroll = document.documentElement.scrollTop;
  
    fingers.forEach((finger, index) => {
  
      const normalizedPoint = iBox.normalizePoint(finger.dipPosition);
      let div = document.getElementById(fingerTipsIds[index]);
  
      if (!div) {
        this.generateFingerTipsCursor(fingerTipsIds[index], fingerTipsColors[index]);
      }
  
      div = document.getElementById(fingerTipsIds[index]);
  
      var appX = normalizedPoint[0] * appWidth;
      var appY = (1 - normalizedPoint[1]) * appHeight;
  
      div.style.top = `${scroll + appY}px`;
      div.style.left = `${appX}px`;
    });
  }
}

class Controller {

  constructor() {
    this.controlsManager = new ControlsManager();
    this.coordinateExtractor = new CoordinateExtractor();
    this.visualizerManager = new VisualizerManager();

    this.initializeModes();
    this.addStorageApiListener();
    this.initializeLeapListener();
  }

  initializeModes() {
    chrome.storage.sync.get({
  
      enableGesture: true, 
      enableVisualizer: true
  
    }, function(items) {
  
      gestureMode = items.enableGesture;
      visualizerMode = items.enableVisualizer;
    });
  }

  initializeLeapListener() {
    const leapController = new Leap.Controller();

    leapController.on('frame', (frame) => {
      
      if(frame.hands.length > 0 && visualizerMode) {
        this.visualizerManager.updateCursorsPosition(frame);
      } else {
        this.visualizerManager.removeCursors();
      }
    
      if (frame.hands.length !== 0 && gestureMode) {
        if(counter === frequency) {
          this.sendImage(frame);
          counter = 1;
        } else {
          counter++;
        }
      }
    });

    leapController.connect();
  }
  
  addStorageApiListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {

      const keys = ['enableVisualizer', 'enableGesture'];
    
      keys.forEach(key => {
        var storageChange = changes[key];
    
        if (!storageChange) {
          return;
        }
    
        if (key === 'enableVisualizer') {
          visualizerMode = storageChange.newValue;
        }
    
        if (key === 'enableGesture') {
          gestureMode = storageChange.newValue;
        }
    
      });
    });
  }

  sendImage(frame) {
    const newFrame = [];
    const iBox = frame.interactionBox;
    
    frame.hands.forEach(hand => {
      hand.fingers.forEach((finger, i) => {
        this.coordinateExtractor.drawFinger(finger, iBox, newFrame, finger_colors[i]);
      });
    });
    
    chrome.runtime.sendMessage({frameData: newFrame}, (response) => {
      console.log("Response: ", response ? response.prediction : '');
  
      this.controlsManager.triggerControls(response);
  
    });
  }

}


const controller = new Controller();