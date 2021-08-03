import React from 'react';
import Button from '@material-ui/core/Button';
import './App.css';

// Calculator actions
const ACTIONS = {
  CLEAR: "NONE",
  OPERATION: "OPERATION",
  EVAL: "EVAL",
  NUMBER: "NUMBER",
  DECIMAL: "DECIMAL"
};

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      topText: "",
      displayText: "0",
      previousAction: ACTIONS.CLEAR,
      decimalAdded: false,
      evalResult: 0
    };

    this.clearInput = this.clearInput.bind(this);
    this.addNumber = this.addNumber.bind(this);
    this.addDecimal = this.addDecimal.bind(this);
    this.addOperation = this.addOperation.bind(this);
    this.evaluate = this.evaluate.bind(this);
  }

  clearInput() {
    this.setState({
      topText: "",
      displayText: "0",
      previousAction: ACTIONS.CLEAR,
      decimalAdded: false,
      evalResult: 0
    });
  }

  addNumber(elem) {
    const number = elem.target.innerText;
    // If there is only a 0 in display, do not allow user to add another 0
    if (this.state.topText.length > 0 && this.state.displayText === "0" && number === "0") { return; }
    // Initialized
    if (this.state.previousAction === ACTIONS.CLEAR || this.state.previousAction === ACTIONS.EVAL) {
      this.setState({
        ...this.state,
        topText: number,
        displayText: number,
        previousAction: ACTIONS.NUMBER
      });
    }
    // Number - Append to current number
    else if (this.state.previousAction === ACTIONS.NUMBER || this.state.previousAction === ACTIONS.DECIMAL) {
      this.setState({
        ...this.state,
        topText: this.state.topText + number,
        displayText: this.state.displayText + number,
        previousAction: ACTIONS.NUMBER
      });
    }
    // Operation - Append to top but reset display
    else if (this.state.previousAction === ACTIONS.OPERATION) {
      this.setState({
        ...this.state,
        topText: this.state.topText + number,
        displayText: number,
        previousAction: ACTIONS.NUMBER
      });
    }
  }

  // Avoid adding multiple decimals in one real number
  addDecimal() {
    if (!this.state.decimalAdded) {
      this.setState({
        ...this.state,
        topText: this.state.topText.length === 0 ? "0." : this.state.topText + ".",
        displayText: this.state.displayText + ".",
        previousAction: ACTIONS.DECIMAL,
        decimalAdded: true
      })
    }
  }

  // Special-case the subtract operation which can also be used as a negative operation
  addOperation(elem) {
    const operation = elem.target.innerText;
    let checkFinalOpsRegex = /[-+/*xX]{1,}$/g;
    
    if (this.state.previousAction !== ACTIONS.OPERATION) {
      this.setState({
        ...this.state,
        topText: this.state.previousAction === ACTIONS.EVAL ? this.state.evalResult + operation : this.state.topText + operation,
        displayText: operation,
        previousAction: ACTIONS.OPERATION,
        decimalAdded: false
      });
    }
    else {
      // Case 1 - Operation is the first element in display, replace operation in both top and display
      if (this.state.topText.length === 1) {
        this.setState({
          ...this.state,
          topText: operation,
          displayText: operation
        });
      }
      // Case 2 - Operation is subtract (which can be negative) AND current length of operations is 1, append current operation
      else if (operation === "-" && this.state.topText.match(checkFinalOpsRegex)[0].length === 1) {
        this.setState({
          ...this.state,
          topText: this.state.topText + operation,
          displayText: operation
        });
      }
      // Case 3 - Any other operation, replace previously queued operations
      else if (operation !== "-") {
        let topReplaced = this.state.topText.replace(checkFinalOpsRegex, "");
        this.setState({
          ...this.state,
          topText: topReplaced + operation,
          displayText: operation
        });
      }
    }
  }

  evaluate(elem) {
    // If empty or only an operation, return "NAN"
    // if (this.state.topText.length === 0 || new RegExp('[xX*/]{1}').test(this.state.topText) || this.state.evalResult === "NAN") {
    //   this.setState({
    //     ...this.state,
    //     topText: this.state.topText + "=NAN",
    //     displayText: "NAN",
    //     previousAction: ACTIONS.EVAL,
    //     evalResult: "NAN"
    //   });
    //   return;
    // }
    
    // Handle decimals
    let numbersRegex = /[-+/xX*]{1,}/g;
    console.log(this.state.topText.split(numbersRegex));
    let numbers = this.state.topText.split(numbersRegex).filter(elem => elem.length > 0).map(elem => parseFloat(elem));
    let operationsRegex = /[^-+/xX*]{1,}/g;
    let operations = this.state.topText.split(operationsRegex);
    
    // See if first operation flips sign for first element
    if (operations[0] === "-") { numbers[0] *= -1; }
    operations.shift();

    // Iterate and execute first-order operations first
    let firstOrderRegex = new RegExp('[xX*/]');
    for (let i = 0; i < operations.length; ++i) {
      if (firstOrderRegex.test(operations[i])) {
        // Differentiate between whether the current operations flips the sign for the second number
        let result = operations[i].length === 2 
          ? this.firstOrderOp(numbers[i], operations[i][0], numbers[i + 1] * -1.0)
          : this.firstOrderOp(numbers[i], operations[i], numbers[i + 1]);
        numbers = [...numbers.slice(0, i), result, ...numbers.slice(i + 2)];
        operations = [...operations.slice(0, i), ...operations.slice(i + 1)];
        console.log(numbers, operations);
        --i;
      }
    }

    // Check if there are any more operations to perform
    if (numbers.length > 1) {
      for (let i = 0; i < operations.length; ++i) {
        let result = operations[i].length === 2
          ? this.secondOrderOp(numbers[i], operations[i][0], numbers[i + 1] * -1.0)
          : this.secondOrderOp(numbers[i], operations[i], numbers[i + 1]);
        numbers = [...numbers.slice(0, i), result, ...numbers.slice(i + 2)];
        operations = [...operations.slice(0, i), ...operations.slice(i + 1)];
        --i;
      }
    }
    this.setState({
      ...this.state,
      topText: this.state.topText + "=" + numbers[0],
      displayText: numbers[0],
      previousAction: ACTIONS.EVAL,
      evalResult: numbers[0]
    });
  }

  // First order is multiplication/division
  firstOrderOp(first, op, second) {
    console.log(first, op, second);
    if (!second) { return first; }
    else if (op === "/") { return first / second; }
    else { return first * second; }
  }

  // Second order is addition/subtraction
  secondOrderOp(first, op, second) {
    if (!second) { return first; }
    else if (op === "+") { return first + second; }
    else { return first - second; }
  }

  render() { 
    return (
      <div className="calculator">
        <div id="header">Calculator</div>
        <div id="top">{this.state.topText}</div>
        <div id="display">{this.state.displayText}</div>
        <Button id="clear" onClick={this.clearInput} variant="contained" color="secondary">AC</Button>
        <Button id="divide" onClick={this.addOperation} variant="contained">/</Button>
        <Button id="multiply" onClick={this.addOperation} variant="contained">x</Button>
        <Button id="seven" onClick={this.addNumber} variant="contained">7</Button>
        <Button id="eight" onClick={this.addNumber} variant="contained">8</Button>
        <Button id="nine" onClick={this.addNumber} variant="contained">9</Button>
        <Button id="subtract" onClick={this.addOperation} variant="contained">-</Button>
        <Button id="four" onClick={this.addNumber} variant="contained">4</Button>
        <Button id="five" onClick={this.addNumber} variant="contained">5</Button>
        <Button id="six" onClick={this.addNumber} variant="contained">6</Button>
        <Button id="add" onClick={this.addOperation} variant="contained">+</Button>
        <Button id="one" onClick={this.addNumber} variant="contained">1</Button>
        <Button id="two" onClick={this.addNumber} variant="contained">2</Button>
        <Button id="three" onClick={this.addNumber} variant="contained">3</Button>
        <Button id="equals" onClick={this.evaluate} variant="contained" color="primary">=</Button>
        <Button id="zero" onClick={this.addNumber} variant="contained">0</Button>
        <Button id="decimal" onClick={this.addDecimal} variant="contained">.</Button>
      </div>
    );
  }
}

export default App;
