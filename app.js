import PianoRoll from './pianoroll.js';
import Utils from './utils.js';

class PianoRollDisplay {
  constructor(csvURL) {
    this.csvURL = csvURL;
    this.data = null;
  }

  async loadPianoRollData() {
    try {
      const response = await fetch('https://pianoroll.ai/random_notes');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.data = await response.json();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  preparePianoRollCard(rollId, bigCard=false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add( bigCard ? 'piano-roll-big-card' : 'piano-roll-card');
    cardDiv.dataset.rollId = rollId;

    // Append the SVG to the card container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('piano-roll-svg');
    svg.setAttribute('width', '90%');
    svg.setAttribute('height', '90%');
    

    // Create and append other elements to the card container as needed
    const descriptionDiv = document.createElement('div');
    descriptionDiv.classList.add('description');
    descriptionDiv.textContent = `This is a piano roll number ${rollId}`;
    
    // if ( bigCard ) {
      // cardDiv.appendChild(svg);
      // cardDiv.appendChild(descriptionDiv);
    // } else { 
      cardDiv.appendChild(descriptionDiv);
      cardDiv.appendChild(svg);
    // }

    return { cardDiv, svg }
  }

  async generateSVGs() {
    if (!this.data) await this.loadPianoRollData();
    if (!this.data) return;
    
    const pianoRollContainer = document.getElementById('pianoRollContainer');
    pianoRollContainer.innerHTML = '';
    for (let it = 0; it < 20; it++) {
      const start = it * 60;
      const end = start + 60;
      const partData = this.data.slice(start, end);

      const { cardDiv, svg } = this.preparePianoRollCard(it)

      pianoRollContainer.appendChild(cardDiv);
      cardDiv.addEventListener('click', handleCardClick)
      const roll = new PianoRoll(svg, partData);
    }
  }
}

const csvToSVG = new PianoRollDisplay();

class SelectedPianoRollSeletorTool
{
  isSelecting = false;
  selection = [0,0];


  constructor(id) {
    let self = this;
    this.id = id;
    this.rollDomElement = document.querySelector(".piano-roll-big-card > svg");
    this.rollDomElement.addEventListener("mousedown", function(e) { self.startSelecting(e, self); })
    this.rollDomElement.addEventListener("mouseleave", function(e) { self.stopSelecting(self); } )
    this.rollDomElement.addEventListener("mouseup", function(e) { self.stopSelecting(self); })
    this.rollDomElement.addEventListener("mousemove", function(e) { self.trackMouse(e, self); })
    this.updateSelection(this);
  }

  getSelectionRectElement(self) {
    for ( const child of self.rollDomElement.childNodes ) {
      if ( child.id == "selection-rect" ) return child;
    }
    return null;
  }

  updateTimestampLabels(self) {
    const timingLabelLeft = document.querySelector("#timing-label-left")
    const timingLabelRight = document.querySelector("#timing-label-right")
    if ( self.selection[0] == self.selection[1] ) {
      timingLabelLeft.style.display = "none";
      timingLabelRight.style.display = "none";
      return;
    } else {
      timingLabelLeft.style.display = "block";
      timingLabelRight.style.display = "block";
    }

    let start = Number(self.rollDomElement.dataset.rollStart);
    let end = Number(self.rollDomElement.dataset.rollEnd);
    let tMin = Math.min(...self.selection);
    let tMax = Math.max(...self.selection);
    timingLabelLeft.innerHTML = (start + (end-start) * tMin).toFixed(4);
    timingLabelRight.innerHTML = (start + (end-start) * tMax).toFixed(4);

    const selectionRect = self.getSelectionRectElement(self)
    if ( !selectionRect ) return;
    const selectionRectBoundingRect = selectionRect.getBoundingClientRect();
    const timingLabelLeftBoundingRect = timingLabelLeft.getBoundingClientRect();
    const timingLabelRightBoundingRect = timingLabelRight.getBoundingClientRect();
    timingLabelLeft.style.left = `${selectionRectBoundingRect.x-timingLabelLeftBoundingRect.width}px`;
    timingLabelLeft.style.top = `${selectionRectBoundingRect.y-timingLabelLeftBoundingRect.height-5}px`;
    
    timingLabelRight.style.left = `${selectionRectBoundingRect.x+selectionRectBoundingRect.width}px`;
    timingLabelRight.style.top = `${selectionRectBoundingRect.y-timingLabelRightBoundingRect.height-5}px`;
  }

  hightlightSelectedNotes(self)
  {
    for ( const child of self.rollDomElement.childNodes ) {
      if ( !child.classList.contains("note-rectangle") ) continue;
      if ( self.selection[0] == self.selection[1] ) {
        child.setAttribute('fill-opacity', "1");
        continue;
      }
      let childX = Number(child.getAttribute('x'));
      let childW = Number(child.getAttribute('width'));
      // console.log(childX+childW)
      let xMin = Math.min(...self.selection);
      let xMax = Math.max(...self.selection);
      if ( Utils.between(childX, xMin, xMax) || Utils.between(childX+childW, xMin, xMax) ) {
        child.setAttribute('fill-opacity', "1")
      } else {
        child.setAttribute('fill-opacity', "0.2")
      }
    }
  }

  getSelectedNotes(self) {
    let result = []
    for ( const child of self.rollDomElement.childNodes ) {
      if ( !child.classList.contains("note-rectangle") ) continue;
      if ( self.selection[0] == self.selection[1] ) continue;
      let childX = Number(child.getAttribute('x'));
      let childW = Number(child.getAttribute('width'));
      let xMin = Math.min(...self.selection);
      let xMax = Math.max(...self.selection);
      if ( Utils.between(childX, xMin, xMax) || Utils.between(childX+childW, xMin, xMax) ) {
        if ( child.dataset.noteData )
          result.push(JSON.parse(child.dataset.noteData));
      } 
    }
    return result;
  }

  getFirstNoteRectangle() {
    for ( const child of this.rollDomElement.childNodes ) {
      if ( child.classList.contains("note-rectangle") ) return child;
    }
    return null;
  }

  updateSelection(self) {
    let selectionRect = self.getSelectionRectElement(self);
    if ( !selectionRect ) {
      selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      let elementBefore = self.getFirstNoteRectangle();
      self.rollDomElement.insertBefore(selectionRect, elementBefore);
    }
    selectionRect.id = "selection-rect";
    selectionRect.setAttribute('fill', '#ffffff');
    selectionRect.setAttribute('fill-opacity', '0.666');
    let xMin = Math.min(...self.selection);
    let xMax = Math.max(...self.selection) - xMin;
    // if ( xMax > 0.99 ) xMax = 1;
    selectionRect.setAttribute('x', `${xMin}`);
    selectionRect.setAttribute('width', `${xMax}`);
    selectionRect.setAttribute('height', `1`);
    // console.log(self)
    
    self.hightlightSelectedNotes(self);
    self.updateTimestampLabels(self);
    requestAnimationFrame(function() {
      self.updateSelection(self);
    });
  }

  trackMouse(e, self) {
    if ( this.isSelecting ) {
      let boxW = self.rollDomElement.getBoundingClientRect().width;
      self.selection[1] = (e.offsetX+2)/boxW;
      // console.log(self.selection)
    }
  }

  startSelecting(e, self) {
    // console.log("Started selecting")
    let boxW = self.rollDomElement.getBoundingClientRect().width;
    self.selection = [e.offsetX/boxW, e.offsetX/boxW];
    // console.log(self.selection);
    self.isSelecting = true;
  }

  stopSelecting(self) {
    // console.log("Stopped selecting")
    self.isSelecting = false;
    self.displaySelectedNotes(self);
  }

  displaySelectedNotes(self)
  {
    const notesDataToDisplay = self.getSelectedNotes(self);
    let selectedNotesOutput;
    if ( document.querySelector("#selectedPianoRollView > #selectedNotesOutput") ) {
      selectedNotesOutput = document.querySelector("#selectedPianoRollView > #selectedNotesOutput");
    } else {
      selectedNotesOutput = document.createElement('div');
      document.querySelector("#selectedPianoRollView").append(selectedNotesOutput);
      selectedNotesOutput.id = "selectedNotesOutput";
    }
    selectedNotesOutput.innerHTML = `<pre>${JSON.stringify( notesDataToDisplay, null, 4 )}</pre>`;
  }
}

class SelectedPianoRollDisplay
{
  data;
  constructor() {}

  showSelectedPianoRollDisplay() {
    document.querySelector("#pianoRollContainer").classList.add("pianoRollContainerMinimized");
    document.querySelector("#selectedPianoRollView").style.display = "flex";
  }

  hideSelectedPianoRollDisplay() {
    document.querySelector("#pianoRollContainer").classList.remove("pianoRollContainerMinimized");
    document.querySelector("#selectedPianoRollView").style.display = "none";
  }

  setSelectedPianoRoll(id) 
  {
    const toDisplay = csvToSVG.preparePianoRollCard(id, true);
    document.querySelector("#selectedPianoRollView").innerHTML = 
    `<span class="return-button">X</span>`;
    document.querySelector(".return-button").addEventListener("click", this.hideSelectedPianoRollDisplay );
    document.querySelector("#selectedPianoRollView").appendChild(toDisplay.cardDiv)
    const start = id * 60;
    const end = start + 60;
    const partData = csvToSVG.data.slice(start, end);
    const roll = new PianoRoll(toDisplay.svg, partData);
    this.selectorTool = new SelectedPianoRollSeletorTool(id);
  }
}

let selectedPianoRollDisplay = null;

function handleCardClick(e) 
{
  e.stopPropagation();
  selectedPianoRollDisplay.showSelectedPianoRollDisplay();
  selectedPianoRollDisplay.setSelectedPianoRoll(e.currentTarget.dataset.rollId);
}

window.onload = async () => {
  await csvToSVG.generateSVGs();
  selectedPianoRollDisplay = new SelectedPianoRollDisplay();
  selectedPianoRollDisplay.data = csvToSVG.data;
  console.log(selectedPianoRollDisplay.data)
}