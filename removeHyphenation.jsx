(function () {
  /**
   * General text fitting algorithm
   * -------------------------
   * Follows the same principle as the binary search, just extended
   * to N-dimensions (in this case, 3).
   *
   * Each dimension starts has a range of [Dmin..Dmax]
   * Current example:
   * Tracking: 			T=[-10  .. 0]
   * Horizontal Scale: 	S=[97 .. 100]
   * Letter spacing: 		L=[-3 .. 0]
   *
   * The solution space is a cube with the dimensions
   * [{Tmin,Smin,Wmin},{Tmax,Smax,Wmax}]
   *
   * at each step,
   * 	  validate the cube
   * 	    true:
   * 	          split cube in 2 sub-cubes along one of the axis
   * 	          store minValues
   * 	    false:
   * 	    	 discard
   * 	    repeat until no valid cubes
   * 	  return stored minValues
   *
   *  validate cube:
   *  cube is valid if text fits at minValues but does not at maxValues
   * in our case the storing of the minValues is done by the validator when it tests if the text fits.
   *
   * Note: we are currently using a cube, but this can be expanded for N dimensions
   */
  var TextFitter = (function () {
    /**
     *
     * @param {number[]} values
     */
    var Point = function (values) {
      this.values = values;
      this.dimensions = this.values.length;
    };
    Point.prototype.getValues = function () {
      return this.values.slice();
    };
    Point.prototype.toString = function () {
      return this.values.toString();
    };
    /**
     *
     * @param {Point} min
     * @param {Point} max
     * @param {Function(text:any,min:number,max:number):boolean} validator
     */
    var Space = function (min, max, validator, minSizes) {
      this.dimensions = min.dimensions;
      this.min = min;
      this.max = max;
      this.validator = validator;
      /**@type number[] */
      this.size = [];
      this.minSizes = minSizes || [];
      //size of the cube, used to break out.
      for (var i = 0; i < this.dimensions; i++) {
        this.size[i] = this.max.values[i] - this.min.values[i];
        this.minSizes[i] =
          this.minSizes[i] === undefined
            ? this.size[i] * 0.05
            : this.minSizes[i];
      }
    };
    Space.prototype.split = function (axis) {
      var r = [];
      var mid =
        (this.max.values[axis] - this.min.values[axis]) / 2 +
        this.min.values[axis];
      var startValues = this.min.getValues();
      var endValues = this.max.getValues();
      endValues[axis] = mid;
      r.push(
        new Space(
          new Point(startValues),
          new Point(endValues),
          this.validator,
          this.minSizes
        )
      );
      startValues = this.min.getValues();
      endValues = this.max.getValues();
      startValues[axis] = mid;
      r.push(
        new Space(
          new Point(startValues),
          new Point(endValues),
          this.validator,
          this.minSizes
        )
      );
      return r;
    };
    Space.prototype.toString = function () {
      return '{' + this.min.toString() + ':' + this.max.toString() + '}';
    };
    Space.prototype.isValid = function (text) {
      //break out if the current solution space is just 1% of the original.
      //the solution should be close enough as not to matter
      for (var i = 0; i < this.dimensions; i++) {
        if (this.size[i] < this.minSizes[i]) {
          return false;
        }
      }
      return this.validator(text, this.min, this.max);
    };

    Space.axisCompensation = 0;

    //recursively split the solutions space to get the solution
    /**
     *
     * @param {Space} space
     * @returns boolean
     */
    Space.splitSpace = function (space, text) {
      var subSpaces, cAxis;
      if (space.isValid(text)) {
        for (var i = 0; i < space.dimensions; i++) {
          cAxis = (Space.axisCompensation + i) % space.dimensions;
          Space.axisCompensation++;
          subSpaces = space.split(cAxis); //split along i dimension
          if (Space.splitSpace(subSpaces[0], text)) {
            //recusively split again
            break; //subSpace[0] contains the solution, don't need to generate other spaces
          }
          if (Space.splitSpace(subSpaces[1], text)) {
            //recusively split again
            break; //subSpace[1] contains the solution, don't need to generate other spaces
          }
        }
        return true;
      }
      return false;
    };
    return {
      Space: Space,
      Point: Point,
    };
  })();

  //the space validator function.
  //applies the space's values to the text and checks
  //if it still oveflows.
  //A space is valid if it over the lines at the max values,
  //but fits at the min values.
  function textValidator(text, min, max, lines) {
    //"this" refers to the current cube
    var currentVal = getValues(text);
    //test max:
    applyValues(text, max.values);
    if (text.lines.length <= lines) {
      //invalid cube
      return false;
    }
    //test min:
    applyValues(text, min.values);
    if (text.lines.length <= lines) {
      //cube is valid
      return true;
    }
    //min value still overflows,
    //cube is invalid
    //restore original values
    applyValues(text, currentVal);
    return false;
  }

  function getValues(text) {
    //[THW]
    return [text.tracking, text.horizontalScale, text.desiredLetterSpacing];
  }

  function applyValues(text, val) {
    text.properties = {
      tracking: val[0],
      horizontalScale: val[1],
      minimumLetterSpacing: val[2],
      desiredLetterSpacing: val[2],
      maximumLetterSpacing: val[2],
    };
    text.recompose();
  }

  function fitText(text, lines) {
    var parentStyleProps=text.appliedParagraphStyle.properties;
    var start = new TextFitter.Point([
      parentStyleProps.tracking - 15,
      parentStyleProps.horizontalScale - 6,
      parentStyleProps.minimumLetterSpacing - 5,
    ]);
    var end = new TextFitter.Point([
      parentStyleProps.tracking + 15,
      parentStyleProps.horizontalScale + 6,
      parentStyleProps.minimumLetterSpacing + 5,
    ]);
    var oldValues = getValues(text);
    var currentSolutionSpace = new TextFitter.Space(start, end, function (
      text,
      min,
      max
    ) {
      return textValidator(text, min, max, lines);
    });
    if (!TextFitter.Space.splitSpace(currentSolutionSpace, text)) {
      applyValues(text, oldValues);
      text.showText();
      return 'CANNOT_FIT';
    }
    return 'FIT_OK';
  }


  function doParagraph(inddText) {
    inddText.showText();
    var lineCount = inddText.lines.length;
    inddText.hyphenation = false;
    inddText.recompose();

    if (inddText.lines.length !== lineCount) {
      return fitText(inddText, lineCount);
    }
  }

  function doStory(story) {
    var oversetFlag = false;
    //don't process master spreads
    if (story.textContainers[0].parent.constructor.name == 'MasterSpread') {
      return;
    }
    var paragraphs = story.paragraphs.everyItem().getElements();
    var result;
    for (var i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].insertionPoints[-1].parentTextFrames[0] == undefined) {
        oversetFlag = true;
        continue;
      }
      result = doParagraph(paragraphs[i]);
      if (result == 'CANNOT_FIT') {
        if (!confirm('Current paragraph cannot be fixed.\nDo you want to continue?')) {
          return false;
        }
      }

    }
    if (oversetFlag) {
      story.texts[0].showText();
      alert(
        'Current story has overset text.\nOverset paragraphs have not been processed.'
      );
    }
  }

  var doc = app.documents[0];
  if (!doc.isValid) {
    alert('Please open a document.');
    return;
  }
  if (doc.selection[0].hasOwnProperty('parentStory')) {
    doStory(doc.selection[0].parentStory);
  } else {
    alert('Select some text, or a story, or a text frame.');
  }
}());