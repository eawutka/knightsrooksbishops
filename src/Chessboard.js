/* eslint-disable radix, eqeqeq*/

import React, { Component } from 'react'
import _ from 'underscore'
import $ from 'jquery'
import chessboard from './chessboard-0.3.0'
import './chessboard-0.3.0.css'
import './Chessboard.css'

class Chessboard extends Component {
  constructor() {
    super();
    this.state = {
      position: "",
      isDragging: false
    }
  }
  render() {
    var width = window.innerWidth - 30
    if (width > 500) {
      width = 500
    }
    return (
      <div className="chessboard" id="board" style={{width}}></div>
    )
  }
  componentDidMount() {
    this.board = chessboard('board', {
      reactComponent: this,
      draggable: true,
      dropOffBoard: 'snapback',
      showNotation: false,
      snapSpeed: 75,
      snapbackSpeed: 150,
      appearSpeed: 300,
      moveSpeed: 500,
      pieceTheme: "img/chesspieces/{piece}.png",
      sparePieces: true,
      sparePiecesPlayer: this.props.appState.player,
      onDragStart: this.onDragStart,
      onMouseoverSquare: this.onMouseoverSquare,
      onMouseoutSquare: this.onMouseoutSquare,
      onDrop: this.onDrop
    })

    console.log(this.props.appState.gameKey)

    this.props.base.bindToState(`gameData/${this.props.appState.gameKey}/position`, {
      context: this,
      state: 'position'
    });

    this.attachSparePieceHoverHandlers()
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.appState.game.status !== 'lobby' && chessboard.objToFen(this.board.position()) !== nextState.position) {
      return true
    } else {
      return false
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.position !== chessboard.objToFen(this.board.position())) {
      this.board.position(this.state.position)
      this.updateSparePieces(this.board.position())
    }   
  }
  onDragStart(source, piece, oldPos) {
    if (!this.reactComponent.canPieceMove(piece)) {
      return false;
    }
    this.reactComponent.setState({
      isDragging: true
    })
    this.reactComponent.highlightLegalMoves(source, piece, oldPos)
    this.reactComponent.updateSparePieces(oldPos, piece)
  }
  onMouseoverSquare(source, piece, oldPos) {
    if (!this.reactComponent.canPieceMove(piece)) {
      return false;
    }
    this.reactComponent.highlightLegalMoves(source, piece, oldPos)
  }
  onMouseoutSquare(square, piece) {
    this.reactComponent.removeHighlighting()
  }
  highlightLegalMoves(source, piece, oldPos) {
    if (piece) {
      this.highlightSquare(source)
        this.allSquares().forEach((square) => {
        if (this.isMoveLegal(true, source, square, piece, oldPos)) {
          this.highlightSquare(square)
        }
      })
    }
  }
  attachSparePieceHoverHandlers() {
    var _this = this;
    $('div[class^="spare-pieces-"] > img').hover(function() {
      if (!_this.canPieceMove($(this).data("piece"))) {
        return false;
      }
      _this.highlightLegalMoves('spare', $(this).data("piece"), _this.board.position())
    }, function() {
      if (!_this.state.isDragging) {
        _this.removeHighlighting();
      }
    })
  }
  onDrop(source, target, piece, newPos, oldPos, orientation) {
    this.reactComponent.removeHighlighting()
    this.reactComponent.setState({
      isDragging: false
    })
    
    //undo if illegal move
    if (!this.reactComponent.isMoveLegal(false, source, target, piece, oldPos, newPos)) {
      this.reactComponent.updateSparePieces(oldPos)
      return 'snapback'
    } else {
      this.reactComponent.updateSparePieces(newPos)

      // score a capture
      if (oldPos[target]) {
        this.reactComponent.props.onScore(this.reactComponent.getOwnerOfPiece(piece))
      }
    }

    this.reactComponent.props.onTurn();
    setTimeout(() => {
      this.reactComponent.props.base.update(`gameData/${this.reactComponent.props.appState.gameKey}`, {
        data: {position: chessboard.objToFen(newPos)},
      });
    }, 1)
  }
  updateSparePieces(position, currentlyHeldPiece) {
    var piecesOnBoard = []
    _.each(position, (pieceType) => {
      piecesOnBoard.push(pieceType)
    })
    if (currentlyHeldPiece) {
      piecesOnBoard.push(currentlyHeldPiece)
    }
    $('[class^="spare-pieces"] [data-piece]').each(function() {
      if (piecesOnBoard.includes($(this).data('piece'))) {
        $(this).hide()
      } else {
        $(this).show()
      }
    })
  }
  isMoveLegal(isHypothetical, source, target, piece, oldPos, newPos) {    
    var isLegal = true
    if (target === 'offboard') {
      isLegal = false
    }
    if (this.props.appState.game.turn != this.getOwnerOfPiece(piece)) {
      isLegal = false
    }
    // checks for new pieces dropped on board
    if (source === 'spare') {
      // check for duplicates on board
      if (!isHypothetical) {
        var existingPieces = []
        _.each(newPos, (piece) => {
          if (existingPieces.includes(piece)) {
            isLegal = false
          }
          existingPieces.push(piece)
        })
      }

      // check if space is empty
      _.each(oldPos, (piece, position) => {
        if (position === target) {
          isLegal = false
        }
      })
      // check if space is on outside row
      if (
        (target.indexOf("a") === -1) &&
        (target.indexOf("h") === -1) &&
        (target.indexOf("1") === -1) &&
        (target.indexOf("8") === -1)
      ) {
        isLegal = false
      }
      // check if space is corner
      if (
          (target == "a1") || 
          (target == "a8") || 
          (target == "h1") || 
          (target == "h8")  
        ) {
          isLegal = false
        }
    } else {
      // check if space is a legal move for each piece type
      // knight
      if (this.getTypeOfPiece(piece) === "N") {
        if (
          !(Math.abs(this.charDistance(source[0], target[0])) === 2 && Math.abs(source[1] - target[1]) === 1) && 
          !(Math.abs(this.charDistance(source[0], target[0])) === 1 && Math.abs(source[1] - target[1]) === 2) 
        ) {
          isLegal = false
        }
      }

      // rook
      if (this.getTypeOfPiece(piece) === "R") {
        // straight lines
        if (source[0] !== target[0] && source[1] !== target[1]) {
          isLegal = false
        }

        // blocking
        if (source[1] !== target[1]) {
          let direction = source[1] < target[1] ? 1 : -1
          for (let i = 1; i < Math.abs(source[1] - target[1]); i++) {
            if (oldPos[source[0] + (parseInt(source[1]) + parseInt(i * direction))]) {
              isLegal = false
            }
          }
        }

        if (source[0] !== target[0]) {
          let direction = source[0].charCodeAt(0) < target[0].charCodeAt(0) ? 1 : -1
          for (let i = 1; i < Math.abs(source[0].charCodeAt(0) - target[0].charCodeAt(0)); i++) {
            if (oldPos[('' + String.fromCharCode(parseInt(source[0].charCodeAt(0)) + parseInt(i * direction))) + source[1]]) {
              isLegal = false
            }
          }
        }        
      } 

      // bishop
      if (this.getTypeOfPiece(piece) === "B") {
        // straight lines
        if (Math.abs(source[1] - target[1]) !== Math.abs(this.charDistance(source[0], target[0]))) {
          isLegal = false
        }
        // blocking
        let directionX = source[1] < target[1] ? 1 : -1
        let directionY = source[0].charCodeAt(0) < target[0].charCodeAt(0) ? 1 : -1
        
        for (let i = 1; i < Math.abs(source[1] - target[1]); i++) {
          if (oldPos['' + String.fromCharCode(parseInt(source[0].charCodeAt(0)) + parseInt(i * directionY)) + (parseInt(source[1]) + parseInt(i * directionX))]) {
            isLegal = false
          }
        }
      } 
    }

    // check if space occupied by player's own piece
    if (
      oldPos[target] && 
      this.getOwnerOfPiece(oldPos[target]) === this.getOwnerOfPiece(piece) 
    ) {
      isLegal = false
    }

    return isLegal
  }
  canPieceMove(piece) {
    if (this.props.appState.game.status === 'active') {
      if (
        this.getOwnerOfPiece(piece) == this.props.appState.player &&
        this.getOwnerOfPiece(piece) == this.props.appState.game.turn
      ) {
        return true;
        }
    } else {
      return false;
    }
  }
  highlightSquare(square) {
    var squareEl = $('#board .square-' + square)
    var background = '#e7f2ff'
    if (squareEl.hasClass('black-3c85d') === true) {
      background = '#d2dee9'
    }
    squareEl.css('background', background)
  }
  removeHighlighting() {
    $('#board .square-55d63').css('background', '')
  }
  getOwnerOfPiece(piece) {
    if (
      (piece === 'wR') ||
      (piece === 'wB') ||
      (piece === 'wN') 
      ) {
        return 1
    }
    if (
      (piece === 'bR') ||
      (piece === 'bB') ||
      (piece === 'bN') 
      ) {
        return 2
    }
    if (
      (piece === 'wK') ||
      (piece === 'wQ') ||
      (piece === 'wP') 
      ) {
        return 3
    }
    if (
      (piece === 'bK') ||
      (piece === 'bQ') ||
      (piece === 'bP') 
      ) {
        return 4
    }
  }
  getTypeOfPiece(piece) {
    if (
      (piece === 'wN') ||
      (piece === 'bN') ||
      (piece === 'wP') ||
      (piece === 'bP') 
      ) {
        return "N"
    }
    if (
      (piece === 'wR') ||
      (piece === 'bR') ||
      (piece === 'wK') ||
      (piece === 'bK') 
      ) {
        return "R"
    }
    if (
      (piece === 'wB') ||
      (piece === 'bB') ||
      (piece === 'wQ') ||
      (piece === 'bQ') 
      ) {
        return "B"
    }
  }
  allSquares() {
    return [ 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8' ]
  }
  charDistance(c1, c2) {
    return c1.charCodeAt(0) - c2.charCodeAt(0)
  }
}

export default Chessboard


/* 

wR: red rook
wB: red bishop
wN: red knight

bR: blue rook
bB: blue bishop
bN: blue knight

wK: yellow rook
wQ: yellow bishop
wP: yellow knight

bK: purple rook
bQ: purple bishop
bP: purple knight

*/