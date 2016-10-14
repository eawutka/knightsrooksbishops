/* eslint-disable radix, eqeqeq*/

import React, { Component } from 'react'
import Rebase from 're-base'
import _ from 'underscore'
import Utility from "./Utility"
import Chessboard from './Chessboard'
import GameMessage from './GameMessage'
import './App.css'

const timeLimit = 10;
const scoreLimit = 5;

class App extends Component {
  constructor() {
    super()

    var playerId = this.getId()
    if (!playerId) {
      playerId = this.createId()
    }

    var base = Rebase.createClass({
      apiKey: "AIzaSyB1tuMppEzw_OX7L5SANYxIGvtKTCmolts",
      databaseURL: "https://chess-15552.firebaseio.com",
      //authDomain: "chess-15552.firebaseapp.com",
    });

    this.state = {
      timer: timeLimit,
      playerId,
      base
    }

    setInterval(() => {
      this.timer();
    }, 1000)

    this.handleScore = this.handleScore.bind(this)
    this.handleTurn = this.handleTurn.bind(this)
  }
  render() {
    if (this.state.game && this.state.gameKey) {
      return (
        <div className="App">
          <img alt="logo" className="logo" src="img/logo.png" />
            <Chessboard base={this.state.base} appState={this.state} onTurn={this.handleTurn} onScore={this.handleScore}></Chessboard>
            <GameMessage appState={this.state}></GameMessage>
            {this.state.game.status == "active" &&
              <div className="score">
                {this.state.game.players.p1 && 
                  <span className="red">{this.state.game.score.p1}</span>
                }
                {this.state.game.players.p2 && 
                  <span className="blue">{this.state.game.score.p2}</span>
                }
                {this.state.game.players.p3 && 
                  <span className="yellow">{this.state.game.score.p3}</span>
                }
                {this.state.game.players.p4 && 
                  <span className="purple">{this.state.game.score.p4}</span>
                }
              </div> 
            }
        </div>
      )
    } else {
      return (
        <div className="App">
          <img alt="logo" className="logo" src="img/logo.png" />
        </div>
      )
    }
  }
  componentDidMount() {
    this.state.base.update(`userData/user-${this.state.playerId}`, {
      data: { active: true }
    })
    window.onbeforeunload = () => {
      this.state.base.update(`userData/user-${this.state.playerId}`, {
        data: { active: false }
      })
      var newPlayers = this.state.game.players
      if (this.state.player) {
        newPlayers[`p${this.state.player}`] = "";
        this.updateGameState({players: newPlayers})
      }
      return null
    }
    this.findGame()
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.game && this.state.game.status === "active" && prevState.game.status !== "active") {
      this.onGameStart()
    }
  }
  findGame() {
    this.state.base.fetch('gameData', {
      context: this,
      then(data){
        var index = (Object.keys(data).length);
        if (data["undefined"]) {
          index--
        }
        this.joinOrCreateGame(data[`game-${index}`], `game-${index}`)
      }
    })
  }
  joinOrCreateGame(mostRecentGame, mostRecentKey) {
    var gameKey;
    
    if (mostRecentGame.status === "lobby") {
      //join existing
      var haveFoundSlot
      ['p1', 'p2', 'p3', 'p4'].forEach((playerKey) => {
        if (!haveFoundSlot && !mostRecentGame.players[playerKey]) {

          mostRecentGame.players[playerKey] = this.state.playerId
          this.updateGameState({players: mostRecentGame.players}, mostRecentKey)

          this.setState({
            player: playerKey[1],
            game: mostRecentGame
          })

          gameKey = mostRecentKey
          haveFoundSlot = true
        }
      })
    } else {
      //create new
      gameKey = `game-${parseInt(mostRecentKey.substring(5)) + 1}`
      this.updateGameState({
        players: {
          p1: this.state.playerId
        },
        position: "",
        score: {
          p1: 0,
          p2: 0,
          p3: 0,
          p4: 0
        },
        connectionCounters: {
          p1: 0,
          p2: 0,
          p3: 0,
          p4: 0
        },
        status: "lobby"
      }, gameKey)

      this.setState({
        player: 1
      })
    }

    this.setState({
      gameKey
    })

    this.state.base.listenTo(`gameData/${gameKey}`, {
      context: this,
      then(data){

        if (
          this.state.player == 1 &&
          data.status === "lobby" &&
          data.players.p1 &&
          data.players.p2 &&
          data.players.p3 &&
          data.players.p4
        ) {
          this.startGame()
        }


        var leavingPlayer;
        if (data.status === "active") {
          if (!data.players.p1 && this.state.game.players.p1) {
            leavingPlayer = 1;
          }
          if (!data.players.p2 && this.state.game.players.p2) {
            leavingPlayer = 2;
          }
          if (!data.players.p3 && this.state.game.players.p3) {
            leavingPlayer = 3;
          }
          if (!data.players.p4 && this.state.game.players.p4) {
            leavingPlayer = 4;
          }
        }
        if (leavingPlayer) {
          if (this.state.game.turn == leavingPlayer) {
            this.handleTurn()
          }
        }


        //check for victory
        if (_.some(data.score, (element) => {
          return element >= scoreLimit
        })) {
          data.status = 'end'
        }

        this.setState({game: data})
      }
    })
  }
  startGame() {
    this.updateGameState({
      status: "active",
      turn: 1
    })
  }
  onGameStart() {
    
  }
  removePlayer(playerKey) {
    var newPlayers = this.state.game.players
    var playerId = newPlayers[playerKey]

    newPlayers[playerKey] = ""
    this.updateGameState({players: newPlayers})

    if (this.state.game.turn === playerKey[1]) {
      this.handleTurn()
    }

    if (playerId) {
      this.state.base.update(`userData/user-${playerId}`, {
        data: { active: false }
      })
    }
    
  }
  handleScore(player) {
    var score = this.state.game.score
    score['p' + player]++
    this.setState({score})
    this.updateGameState({score: score})
  }
  handleTurn() {
    if (this.state.game.status === 'active') {
      var newTurn;
      var nextPlayerFound;
      var i = this.state.game.turn + 1;
      while (!nextPlayerFound) {
        if (this.isPlayerInGame(i)) {
          nextPlayerFound = true
          newTurn = i
        } else {
          if (i >= 4) {
            i = 1
          } else {
            i++
          }
        }
      }
      this.setState({
        turn: newTurn,
        timer: timeLimit,
      })
      this.updateGameState({turn: newTurn})
    } else {
      this.updateGameState({turn: null})
    }
  }
  isPlayerInGame(i) {
    if (this.state.game.players[`p${i}`]) {
      return true
    }
  }
  timer() {
    if (this.state.game && (this.state.game.status === "active" || this.state.game.status === "lobby")) {

      var newCounters = this.state.game.connectionCounters
      var newCounter = {}
      newCounter[`p${this.state.player}`] = this.state.game.connectionCounters[`p${this.state.player}`] + 1 
      this.updateGameState(newCounter, `${this.state.gameKey}/connectionCounters`)
      

      // every 5 seconds, check to see if other players are incrementing their connection counters
      if (newCounters[`p${this.state.player}`] % 5 === 0) {
        if (this.state.oldCounters) {
          ['p1', 'p2', 'p3', 'p4'].forEach((playerKey) => {
            if (this.state.game.players[playerKey] && this.state.oldCounters[playerKey] === newCounters[playerKey]) {
              this.removePlayer(playerKey)
            }
          })
        }        
        this.setState({oldCounters: newCounters})
      }

      if (this.state.game.turn == this.state.player) {
        if (this.state.timer <= 1) {
          this.handleTurn()
          this.setState({
            timer: timeLimit
          })
        } else { 
          this.setState({
            timer: this.state.timer - 1
          })
        }
      }
    }
  }
  getId() {
    return localStorage.getItem('chessPlayerId') 
  }
  createId() {
    var id = Utility.guid()
    localStorage.setItem('chessPlayerId', id)
    return id
  }
  updateGameState(data, key = this.state.gameKey) {
    this.state.base.update(`gameData/${key}`, {
      data
    });
  }
}

export default App