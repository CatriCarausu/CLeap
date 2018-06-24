import 'babel-polyfill';
import KerasJS from 'keras-js';
import Queue from './utils/queue';

import five from './test/five';
import two from './test/two';
import rock from './test/rock';
import nothing from './test/none';

const CNN_MODEL_PATH = 'https://drive.google.com/uc?export=download&id=1ZAIe6zHqnO2_LXTNaNv-UhXkL2DfDW10';
const modelv2 = 'https://drive.google.com/uc?export=download&id=1j3Mx4-40YZihlIgvYAwGXLfwcjl3RJOB';
const model100 = 'https://drive.google.com/uc?export=download&id=1x8yAHzQojZYolbGht5U7fY7awf8m0E5G';
class BackgroundProcessor {

  constructor() {
    this.h = 50; 
    this.w = 50;

    this.count = 0;

    this.omfg = [new Float32Array(five), new Float32Array(rock), new Float32Array(two), new Float32Array(nothing)];

    this.loadModel();
    this.evaluateTests();
    this.addListener();
  }

  loadModel() {
    console.log('Loading model...');

    this.model = new KerasJS.Model({
      filepath: modelv2
    });

    console.log(`Model loaded and initialized...`);
  }

  async evaluateTests() {
    const startTime = performance.now();

    try {
      await this.model.ready();
      const inputData = {
        input: new Float32Array(five)
      };

      const prediction = await this.model.predict(inputData);

      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Prediction done in ${totalTime}ms`);

    } catch (err) {
      console.log('error predicting...', err);
    }
  }

  addListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

      const imageData = this.buildImage(msg.frameData);
      const flatArray = this.flattenArray(imageData);

      this.sendPrediction(sendResponse, flatArray);
      
      return true;
    });
  }

  async sendPrediction(sendResponse, flatArray) {

    console.log('Predicting...');
    const startTime = performance.now();

    try {
      await this.model.ready();
      const inputData = {
        input: flatArray
      };

      const prediction = await this.model.predict(inputData);

      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Prediction done in ${totalTime}ms`);
      
      const pred = Array.prototype.slice.call(prediction.output);
      sendResponse({prediction: pred, img: flatArray.buffer, error: null});

      console.log('Response sent');

    } catch (err) {
      sendResponse({prediction: null, img: flatArray.buffer, error: err});
    }
  }

  buildImage(frame) {
    let xvariation = [0];
    let yvariation = [0, 1];
  
    let imageData = this.generateZeros(this.h, this.w);
  
    frame.forEach(point => {
      const scaledCoordinates = this.scaleToImageCoordinates(point.x, point.y);
      let appx = scaledCoordinates[0];
      let appy = scaledCoordinates[1];
  
      xvariation.forEach(x => {
        yvariation.forEach(y => {
          let xx = x + appx;
          let yy = y + appy;
  
          if (!(xx < 0 || yy < 0 || xx >= this.w || yy >= this.h)){
            imageData[yy][xx] = point.color;
          }
        });
      });
    });
    
    return imageData;
  }
  
  scaleToImageCoordinates(x, y) {
    const appRange = 40;
    const app_x = 5 + x * appRange;
    const app_y = 5 + y * appRange;
    return [Math.floor(app_x), Math.floor(app_y)]
  }
  
  generateZeros(h, w) {
    const v = [];
  
    for (let i = 0; i < h; i++) {
      v.push([]);
      for (let j = 0; j < w; j++) {
        v[i].push([0, 0, 0]);
      }
    }
  
    return v;
  }

  flattenArray(original) {
    let aux = [].concat.apply([], original);
    aux = [].concat.apply([], aux);
    return new Float32Array(aux);
  }
}

var bg = new BackgroundProcessor();