/*
==================================================================================

Copyright (c) 2023 David Benepe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

==================================================================================

Script Version: 1.0

*/

const SPLATOON_3_INK_SCHEDULE_URL = "https://splatoon3.ink/data/schedules.json";

// Local filemanager to cache data to.
const fm = FileManager.local();

const CACHE_DIR = fm.cacheDirectory();

const CACHE_FILE = CACHE_DIR + "/" + "splatoon3ink_cache.txt";

const DEBUG_SKIP_IMG_CACHE = false;

let cached_images = {};

// Make sure we present the newest stages.
function isCachedFileOutOfDate() {
  let currentDate = new Date();
  let lastDate = fm.modificationDate(CACHE_FILE);
  
  if(currentDate.getHours() != lastDate.getHours()) {
    return true;
  }
  
  let cachedDataStr = fm.readString(CACHE_FILE);
  let cachedDataJson = JSON.parse(cachedDataStr)["data"];
  
  let endDateStr = cachedDataJson["regularSchedules"]["nodes"][0].endTime;
  let endDate = new Date(endDateStr);
  let dateDiff = endDate - currentDate;
  if(dateDiff < 0) {
    return true;
  }
  
  return false;
}

async function getImageFromURL(imgUrl) {
  // First check if the image is already loaded.
  if(cached_images[imgUrl] != undefined) {
    console.log(imgUrl + ": " + cached_images[imgUrl]);
    return cached_images[imgUrl];
  }
  // Second check if the image is on the device's cache directory.
  let localFilepath = CACHE_DIR + "/" + fm.fileName(imgUrl, true);
  let localFileExists = fm.fileExists(localFilepath);
  
  if(localFileExists && !DEBUG_SKIP_IMG_CACHE) {
    cached_images[imgUrl] = fm.readImage(localFilepath);
    return cached_images[imgUrl];
  }
  
  // Image is not in local cache directory, so load it from a url.
  let newImg = await new Request(imgUrl).loadImage();
  
  // Write image to cache filepath
  fm.writeImage(localFilepath, newImg);
  // Cache image
  cached_images[imgUrl] = newImg;
  // Return the new image.
  return newImg;
}

class Splatoon3Stage {
  constructor(name, imgUrl) {
    this.name = name;
    this.imgUrl = imgUrl;
    console.log(this.name);
    console.log(this.imgUrl);
  }
  
  async add_to_widget(widget) {
    let stack = widget.addStack();
    stack.setPadding(1, 1, 1, 1);
    stack.centerAlignContent();
    let img = await getImageFromURL(this.imgUrl);
    let stageImg = stack.addImage(img);
    stack.addSpacer();
    let stageName = stack.addText(this.name);
    stack.addSpacer();
  }
}

class Splatoon3GameMode {
  constructor(mode, color, stages) {
    this.mode = mode;
    this.color = color;
    this.stages = stages;
  }
  
  async add_to_widget(widget) {
    let heading = widget.addText(this.mode);
  heading.centerAlignText();
  heading.font = Font.lightSystemFont(20);
  heading.textColor = this.color;
    
    for(let stage of this.stages) {
      await stage.add_to_widget(widget);
    }
  }
}

async function getSplatoon3InkData() {
    let foundCacheFile = false;
    
    // First check if the cache file exists.
   let cacheFileExists = fm.fileExists(CACHE_FILE)
  
  if(cacheFileExists) {
    if(!isCachedFileOutOfDate()) {
      foundCacheFile = true;
      console.log("Using cached data!");
    }
  }
  
  // No cache file found, get the data and store it to cache.
  if(!foundCacheFile) {
    const request = new Request(SPLATOON_3_INK_SCHEDULE_URL);
    const jsonText = await request.loadString();
    fm.writeString(CACHE_FILE, jsonText);
  }
  let cachedDataStr = fm.readString(CACHE_FILE);
  return JSON.parse(cachedDataStr)["data"];
}

function getTurfWarStages(splatData) {
  if(splatData == undefined) {
    throw new Error("splat data is undefined!");
  }
  
  const turfSched = splatData["regularSchedules"];
  const turfSchedNodes = turfSched["nodes"];
  const nowNode = turfSchedNodes[0];
  const stagesInfo = nowNode["regularMatchSetting"];
  const stages = stagesInfo["vsStages"];
  const stage0 = stages[0];
  const stage1 = stages[1];
  let outStages = [
    new Splatoon3Stage(stage0.name, stage0["image"].url),
    new Splatoon3Stage(stage1.name, stage1["image"].url)
  ];
  return new Splatoon3GameMode("Turf War", new Color("5ABF40"), outStages);
}

function getAnarchyStages(splatData, type=0) {
  const anarSched = splatData["bankaraSchedules"];
  const anarSchedNodes = anarSched["nodes"];
  const nowNode = anarSchedNodes[0];
  const stagesInfo = nowNode["bankaraMatchSettings"][type];
    const stages = stagesInfo["vsStages"];
    const mode = (type == 0 ? "Series" : "Open") + " (" + stagesInfo["vsRule"]["name"] + ")";
    const stage0 = stages[0];
    const stage1 = stages[1];
    let outStages = [
      new Splatoon3Stage(stage0.name, stage0["image"].url),
      new Splatoon3Stage(stage1.name, stage1["image"].url)
    ];
    return new Splatoon3GameMode(mode, new Color("#D2512A"), outStages);
}

async function addContent(widget){
  let splatData = await getSplatoon3InkData();
  let turfWarStages = getTurfWarStages(splatData);
  let anarchySeriesStages = getAnarchyStages(splatData, 0);
  let anarchyOpenStages = getAnarchyStages(splatData, 1);
  
  await turfWarStages.add_to_widget(widget);
  widget.addSpacer();
  await anarchySeriesStages.add_to_widget(widget);
  widget.addSpacer();
  await anarchyOpenStages.add_to_widget(widget);
}

async function createWidget() {
  let listwidget = new ListWidget();
  
  await addContent(listwidget);
  
  return listwidget;
}

let widget = await createWidget();

if(config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}

Script.complete();
