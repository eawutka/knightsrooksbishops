/* eslint-disable radix, eqeqeq*/

import React, { Component } from 'react'
import _ from 'underscore'
import './App.css'

class GameMessage extends Component {
  constructor() {
    super()
    this.state = {
      message: "Welcome"
    }
  }
  render() {
    return (
      <p className="game-message">{this.state.message}</p>
    )
  }
  componentWillReceiveProps(nextProps) {
    var newState = nextProps.appState
    //messages in order of lowest to highest priority
    var message = "Connecting..."
    var priorityMessage = {}
    //current turn
    if (newState.game.status === "active") {
      if (newState.game.turn == newState.player) {
        let plural = newState.timer > 1 ? "s" : ""
        message = `It's your turn. You have ${newState.timer} second${plural} to move.`
      } else {
        message = `${this.getPlayerName(newState.game.turn)}'s turn.`
      }
    } 
    //victory
    if (newState.game.status === 'end') {
      var winner = Object.keys(newState.game.score).reduce((a, b) => { return newState.game.score[a] > newState.game.score[b] ? a : b })[1];
      message = `Game over! ${this.getPlayerName(winner)} wins!` 
    }
    //lobby
    if (newState.game.status === 'lobby') {
      var numberOfPlayers = _.filter(newState.game.players, (playerId) => {
        if (playerId) { return true } else { return false }
      }).length
      let plural = 4 - numberOfPlayers > 1 ? "s" : ""
      message = `Waiting for ${4 - numberOfPlayers} more player${plural} to join.`
    } 
    
    if (newState.game.status != 'lobby') {
      if (_.filter(newState.game.players, (player) => { return player }).length == 1) {
        message = 'All other players have left.'
      }
    }

    // prority messages that stick aroud for a certain time and aren't entirely state-dependent
    if (this.state.priorityMessage && this.state.priorityMessage.time) {
      message = this.state.priorityMessage.message
      priorityMessage = this.state.priorityMessage
      priorityMessage.time--
    }

    _.each(newState.game.players, (playerId, playerKey) => {
      if (!playerId && this.props.appState.game.players[playerKey]) {
        priorityMessage = {
          message: `${this.getPlayerName(playerKey[1])} has left the game.`,
          time: 3
        }
      }
    })

    this.setState({
      message,
      priorityMessage
    })
  }
  getPlayerName(player) {
    return ['Red', 'Blue', 'Yellow', 'Purple'][player - 1]
  }
}

export default GameMessage