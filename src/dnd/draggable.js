/**
 * Draggable unit
 *
 * Copyright (C) Nikolay V. Nemshilov aka St.
 */
var Draggable = new Class(Observer, {
  extend: {
    EVENTS: $w('start drag stop drop'),
    
    Options: {
      handle:         null,            // a handle element that will start the drag
      
      snap:           0,               // a number in pixels or [x,y]
      constraint:     null,            // null or 'x' or 'y' or 'vertical' or 'horizontal'
      range:          null,            // {x: [min, max], y:[min, max]} or reference to another element
      
      dragClass:      'dragging',      // the in-process class name
      
      clone:          false,           // if should keep a clone in place
      revert:         false,           // marker if the object should be moved back on finish
      revertDuration: self.Fx ? 'normal' : 0,  // the moving back fx duration
      
      relName:        'draggable'      // the audodiscovery feature key
    }
  },
  
  /**
   * Basic controller
   *
   * @param mixed element reference
   * @param Object options
   */
  initialize: function(element, options) {
    this.element = $(element);
    this.$super(options);
    
    this.init();
  },
  
  /**
   * detaches the mouse observers out of the draggable element
   *
   * @return this
   */
  destroy: function() {
    this.handle.stopObserving('mousedown', this._dragStart);
    return this;
  },
  
  // additional options processing
  setOptions: function(options) {
    this.$super(options);
    
    // checking the handle
    this.handle = this.options.handle ? $(this.options.handle) : this.element;
    
    // checking the spappings
    if (isArray(this.options.snap)) {
      this.snapX = this.options.snap[0];
      this.snapY = this.options.snap[1];
    } else {
      this.snapX = this.snapY = this.options.snap;
    }
    
    
    
    return this;
  },
  
  /**
   * Moves the element back to the original position
   *
   * @return this
   */
  revert: function() {
    var end_style = {
      left: this.startPos.x + 'px',
      top:  this.startPos.y + 'px'
    };
    
    if (this.options.revertDuration) {
      this.element.morph(end_style, {
        duration: this.options.revertDuration,
        onFinish: this.swapBack.bind(this)
      })
    } else {
      this.element.setStyle(end_style);
      this.swapBack();
    }
    
    return this;
  },
  
// protected

  init: function() {
    // caching the callbacks so that we could call them later
    this._dragStart = this.dragStart.bind(this);
    this._dragStop  = this.dragStop.bind(this);
    this._dragProc  = this.dragProcess.bind(this);
    
    this.handle.onMousedown(this._dragStart);
  },
  
  // handles the event start
  dragStart: function(event) {
    event.stop(); // prevents the text selection
    
    // calculating the positions diff
    this.startPos = this.element.position();
    
    this.xDiff = event.pageX - this.startPos.x;
    this.yDiff = event.pageY - this.startPos.y;
    
    // building a clone element if necessary
    if (this.options.clone || this.options.revert) {
      this.clone = $(this.element.cloneNode(true)).setStyle({
        visibility: this.options.clone ? 'visible' : 'hidden'
      }).insertTo(this.element, 'before');
    }
    
    // reinserting the element to the body so it was over all the other elements
    this.element.setStyle({
      position: 'absolute',
      left:      this.startPos.x + 'px',
      top:       this.startPos.y + 'px'
    }).addClass(this.options.dragClass).insertTo(document.body);
    
    document.on('mousemove', this._dragProc);
    document.on('mouseup',   this._dragStop);
    
    this.calcConstraints().fire('start');
  },
  
  // catches the mouse move event
  dragProcess: function(event) {
    var x = event.pageX - this.xDiff, y = event.pageY - this.yDiff, position = {};
    
    // checking the range
    if (this.ranged) {
      if (this.minX > x) x = this.minX;
      if (this.maxX < x) x = this.maxX;
      if (this.minY > y) y = this.minY;
      if (this.maxY < y) y = this.maxY;
    }
    
    // checking the snaps
    if (this.snapX) x = x - x % this.snapX;
    if (this.snapY) y = y - y % this.snapY;
    
    // checking the constraints
    if (!this.constraintY) position.left = x + 'px';
    if (!this.constraintX) position.top  = y + 'px';
    
    this.element.setStyle(position);
    
    this.fire('drag');
  },
  
  // handles the event stop
  dragStop: function(event) {
    this.element.removeClass(this.options.dragClass);
    document.stopObserving('mouseup', this._dragStop).stopObserving('mousemove', this._dragProc);
    
    if (this.options.revert) {
      this.revert();
    }
    
    this.fire('stop');
  },
  
  // swaps the clone element to the actual element back
  swapBack: function() {
    if (this.clone) {
      this.clone.insert(
        this.element.setStyle({
          position: this.clone.getStyle('position')
        }), 'before'
      ).remove();
    }
  },
  
  // calculates the constraints
  calcConstraints: function() {
    var constraint = this.options.constraint;
    this.constraintX = ['x', 'horizontal'].include(constraint);
    this.constraintY = ['y', 'vertical'].include(constraint);
    
    var range = this.options.range;
    if (range) {
      this.ranged = true;
      
      // if the range is defined by another element
      var element = $(range);
      if (isElement(element)) {
        var dims = element.dimensions();
        
        range = {
          x: [dims.left, dims.left + dims.width],
          y: [dims.top,  dims.top + dims.height]
        };
      }

      if (isHash(range)) {
        var size = this.element.sizes();
        
        if (range.x) {
          this.minX = range.x[0];
          this.maxX = range.x[1] - size.x;
        }
        if (range.y) {
          this.minY = range.y[0];
          this.maxY = range.y[1] - size.y;
        }
      }
    }
    
    return this;
  }
});