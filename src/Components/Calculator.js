import React, { useState, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import './Calculator.css';

// Calculator actions
const ACTIONS = {
  CLEAR: "NONE",
  OPERATION: "OPERATION",
  EVAL: "EVAL",
  NUMBER: "NUMBER",
  DECIMAL: "DECIMAL"
};

const REGEX = {
  SINGLE_OP: new RegExp('^[-+xX*/]{1}'),
  SINGLE_NUMBER: new RegExp('[0-9]{1}'),
  FINAL_OPS: /[-+/*xX]{1,}$/g,
  NUMBERS: /[-+/xX*]{1,}/g,
  OPERATIONS: /[^-+/xX*]{1,}/g,
  FIRST_ORDER: new RegExp('[xX*/]')
};


function Calculator() {
  const [calcState, setCalcState] = useState({
    topText: "",
    displayText: "0",
    previousAction: ACTIONS.CLEAR,
    decimalAdded:false,
    evalResult: ""
  });

  useEffect(() => {
    function handleKeyPress(props) {
      if (REGEX.SINGLE_NUMBER.test(props.key)) { addNumber(props.key); }
      else if (REGEX.SINGLE_OP.test(props.key)) { addOperation(props.key); }
      else if (props.key === "Enter") { evaluate(); }
      else if (props.key === "Escape") { clear(); }
    }

    document.addEventListener("keydown", handleKeyPress);
    return function cleanup() {
      document.removeEventListener("keydown", handleKeyPress);
    };
  });

  const clear = () => {
    setCalcState({
      topText: "",
      displayText: "0",
      previousAction: ACTIONS.CLEAR,
      decimalAdded:false,
      evalResult: ""
    });
  }

  const addNumber = (elem) => {
    // Either grab from UI (innerText) or keypress (elem)
    const number = elem.target ? elem.target.innerText : elem;
    // If there is only a 0 in display, do not allow user to add another 0
    if (calcState.topText.length > 0 && calcState.displayText === "0" && number === "0") { return; }
    // Initialized
    if (calcState.previousAction === ACTIONS.CLEAR || calcState.previousAction === ACTIONS.EVAL) {
      setCalcState({
        ...calcState,
        topText: number,
        displayText: number,
        previousAction: ACTIONS.NUMBER
      });
    }
    // Number - Append to current number
    else if (calcState.previousAction === ACTIONS.NUMBER || calcState.previousAction === ACTIONS.DECIMAL) {
      setCalcState({
        ...calcState,
        topText: calcState.topText + number,
        displayText: calcState.displayText + number,
        previousAction: ACTIONS.NUMBER
      });
    }
    // Operation - Append to top but reset display
    else if (calcState.previousAction === ACTIONS.OPERATION) {
      setCalcState({
        ...calcState,
        topText: calcState.topText + number,
        displayText: number,
        previousAction: ACTIONS.NUMBER
      });
    }
  }

  // Avoid adding multiple decimals in one real number
  const addDecimal = () => {
    if (!calcState.decimalAdded) {
      setCalcState({
        ...calcState,
        topText: calcState.topText.length === 0 ? "0." : calcState.topText + ".",
        displayText: calcState.displayText + ".",
        previousAction: ACTIONS.DECIMAL,
        decimalAdded: true
      });
    }
  }

  const addOperation = (elem) => {
    const operation = elem.target ? elem.target.innerText : elem;
    
    if (calcState.previousAction !== ACTIONS.OPERATION) {
      setCalcState({
        ...calcState,
        topText: calcState.previousAction === ACTIONS.EVAL ? calcState.evalResult + operation : calcState.topText + operation,
        displayText: operation,
        previousAction: ACTIONS.OPERATION,
        decimalAdded: false
      });
    }
    else {
      // Case 1 - Operation is the first element in display, replace operation in both top and display
      if (calcState.topText.length === 1) {
        setCalcState({
          ...calcState,
          topText: operation,
          displayText: operation
        });
      }
      // Case 2 - Operation is subtract (which can be negative) AND current length of operations is 1, append current operation
      else if (operation === "-" && calcState.topText.match(REGEX.FINAL_OPS)[0].length === 1) {
        setCalcState({
          ...calcState,
          topText: calcState.topText + operation,
          displayText: operation
        });
      }
      // Case 3 - Any other operation, replace previously queued operations
      else if (operation !== "-") {
        let topReplaced = calcState.topText.replace(REGEX.FINAL_OPS, "");
        setCalcState({
          ...calcState,
          topText: topReplaced + operation,
          displayText: operation
        });
      }
    }
  }

  const evaluate = (elem) => {
    // If already evaluated, early return
    if (calcState.previousAction === ACTIONS.EVAL) { return; }

    // If empty or only an operation, return "NAN"
    if (calcState.topText.length === 0 || REGEX.SINGLE_OP.test(calcState.topText) || calcState.evalResult === "NAN") {
      setCalcState({
        ...calcState,
        topText: calcState.topText + "=NAN",
        displayText: "NAN",
        previousAction: ACTIONS.EVAL,
        evalResult: "NAN"
      });
      return;
    }
    if (REGEX.SINGLE_NUMBER.test(calcState.topText)) {
      setCalcState({
        ...calcState,
        topText: calcState.topText + "=" + calcState.topText,
        previousAction: ACTIONS.EVAL,
        evalResult: calcState.displayText
      });
    }
    
    // Handle decimals
    let numbers = calcState.topText.split(REGEX.NUMBERS).filter(elem => elem.length > 0).map(elem => parseFloat(elem));
    let operations = calcState.topText.split(REGEX.OPERATIONS);
    
    // See if first operation flips sign for first element
    if (operations[0] === "-") { numbers[0] *= -1; }
    operations.shift();

    // Iterate and execute first-order operations first
    for (let i = 0; i < operations.length; ++i) {
      if (REGEX.FIRST_ORDER.test(operations[i])) {
        // Differentiate between whether the current operations flips the sign for the second number
        let result = operations[i].length === 2 
          ? firstOrderOp(numbers[i], operations[i][0], numbers[i + 1] * -1.0)
          : firstOrderOp(numbers[i], operations[i], numbers[i + 1]);
        numbers = [...numbers.slice(0, i), result, ...numbers.slice(i + 2)];
        operations = [...operations.slice(0, i), ...operations.slice(i + 1)];
        --i;
      }
    }

    // Check if there are any more operations to perform
    if (numbers.length > 1) {
      for (let i = 0; i < operations.length; ++i) {
        let result = operations[i].length === 2
          ? secondOrderOp(numbers[i], operations[i][0], numbers[i + 1] * -1.0)
          : secondOrderOp(numbers[i], operations[i], numbers[i + 1]);
        numbers = [...numbers.slice(0, i), result, ...numbers.slice(i + 2)];
        operations = [...operations.slice(0, i), ...operations.slice(i + 1)];
        --i;
      }
    }
    setCalcState({
      ...calcState,
      topText: calcState.topText + "=" + numbers[0],
      displayText: numbers[0],
      previousAction: ACTIONS.EVAL,
      evalResult: String(numbers[0])
    });
  }

  // First order is multiplication/division
  const firstOrderOp = (first, op, second) => {
    if (!second) { return first; }
    else if (op === "/") { return first / second; }
    else { return first * second; }
  }

  // Second order is addition/subtraction
  const secondOrderOp = (first, op, second) => {
    if (!second) { return first; }
    else if (op === "+") { return first + second; }
    else { return first - second; }
  }

  return (
    <div className="calculator">
      <div id="top">{calcState.topText}</div>
      <div id="display">{calcState.displayText}</div>
      <Button id="clear" onClick={() => clear()} variant="contained" color="secondary">AC</Button>
      <Button id="divide" onClick={(op) => addOperation(op)} variant="contained">/</Button>
      <Button id="multiply" onClick={(op) => addOperation(op)} variant="contained">x</Button>
      <Button id="seven" onClick={(num) => addNumber(num)} variant="contained">7</Button>
      <Button id="eight" onClick={(num) => addNumber(num)} variant="contained">8</Button>
      <Button id="nine" onClick={(num) => addNumber(num)} variant="contained">9</Button>
      <Button id="subtract" onClick={(op) => addOperation(op)} variant="contained">-</Button>
      <Button id="four" onClick={(num) => addNumber(num)} variant="contained">4</Button>
      <Button id="five" onClick={(num) => addNumber(num)} variant="contained">5</Button>
      <Button id="six" onClick={(num) => addNumber(num)} variant="contained">6</Button>
      <Button id="add" onClick={(num) => addOperation()} variant="contained">+</Button>
      <Button id="one" onClick={(num) => addNumber(num)} variant="contained">1</Button>
      <Button id="two" onClick={(num) => addNumber(num)} variant="contained">2</Button>
      <Button id="three" onClick={(num) => addNumber(num)} variant="contained">3</Button>
      <Button id="equals" onClick={() => evaluate()} variant="contained" color="primary">=</Button>
      <Button id="zero" onClick={(num) => addNumber(num)} variant="contained">0</Button>
      <Button id="decimal" onClick={() => addDecimal()} variant="contained">.</Button>
    </div>
  );
}

export default Calculator;