var d3 = require('d3')
var io = require('indian-ocean')
var jp = require('d3-jetpack')


d3.nestBy = jp.nestBy
d3.descendingKey = jp.descendingKey

var matches = io.readDataSync('matches.tsv')


matches.forEach(function(d){
  d.winner = +d.winner
  if (isNaN(d.winner)) d.winner = 0
  d.completed = !(d.winner === 0)
  d.allTeams = d.t1 + '-' + d.t2
  d.wName = d['t' + d.winner]
})

var incomplete = matches.filter(function(d){ return !d.completed })


var scenarios = d3.range(4096).map(function(i){
  incomplete.forEach(function(d, j){
    d.winner = (i >> j) % 2 ? 1 : 2 
    d.wName = d['t' + d.winner]
  })

  str = incomplete.map(d => d.winner).join('')

  return {
    str: incomplete.map(d => d.winner).join(''),
    teams: scoreMatches(), 
    incomplete: JSON.parse(JSON.stringify(incomplete)),
    i
  }    
})

// 100111010111
// 000101000110

function scoreMatches(){
  var teams = d3.nestBy(matches, d => d.t1)
    .map(function(d){
    return {name: d.key, w: 0}
  })


  
  var nameToTeam = {}
  teams.forEach(function(d){ nameToTeam[d.name] = d })

  matches.forEach(addMatchWins)

  teams.forEach(function(d){
    d.wins = d.w 
    d.w = 0
  })

  d3.nestBy(teams, d => d.wins).forEach(function(d){
    if (d.length == 1 || d.length > 3) return

    if (d.length == 2){
      tiedTeams(d)
    }
    if (d.length == 3){

      tiedTeams(d)
      var tied = 0
      d.forEach(function(d){
        if (d.w == 4) d.w = 100
        if (d.w == 3) {d.m = true
          d.w = 0
          tied++}
        else if (d.w == 0) d.w = -100
        else {
          d.w = 0
          tied++
        }
      })

      if (tied == 2){
        tiedTeams(d.filter(d => d.w == 0))
      }
    }
  })

  function tiedTeams(d){
    var tiedTeams = d.map(d => d.name).join('-')
      matches
        .filter(function(d){
          return tiedTeams.includes(d.t1) && tiedTeams.includes(d.t2) })
        .forEach(addMatchWins)
  }

  var advanceSlots = 4
  d3.nestBy(teams, function(d){ return d.w + d.wins*10000 })
    .sort(d3.descendingKey(d => +d.key))
    .forEach(function(d){
      
      if (d.length == 1 && advanceSlots == 4){
        d.forEach(function(e){ e.advance = 'u'})
      }
      else if (d.length <= advanceSlots){
        d.forEach(function(e){ e.advance = 't'})
      } else if (advanceSlots > 0){
        d.forEach(function(e){ e.advance = e.m?'t':'m'})

      } else{
        d.forEach(function(e){ e.advance = 'f'})
      }
      advanceSlots -= d.length
    })

  // if (str == '212111112222') console.log(teams)

  function addMatchWins(d){
    nameToTeam[d.wName].w++ 
  }
  
  return teams
}




outdata = scenarios.map(d => {
  var rv = {str: d.str}
  d.teams.forEach(d => rv[d.name] = d.advance)

  return rv
})


io.writeDataSync('scenarios.tsv', outdata)