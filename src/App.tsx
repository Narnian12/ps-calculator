import React from 'react';
import Calculator from './Components/Calculator';
import './App.css';


class App extends React.Component {
  render() { 
    return (
      <div className="main">
        <div className="header">Calculator</div>
        <Calculator />
      </div>
    );
  }
}

export default App;
