const io = require("socket.io-client");
class Bot{

  constructor({username, password, attribute, isSkipBoss, isUsePot}){
    this.socket = io("https://tiny-rpg-server.herokuapp.com", { transports: ["websocket"], upgrade: !1 })
    this.token = null;
    this.user = {username, password}
    this.currentDate = 0;
    this.oldData = {};
    this._points = 0
    this.mustStart = true
    this.resets = 0
    this.timer = 0
    this.exp = 0
    this.isSkipBoss = isSkipBoss
    this.attr = attribute
    this.isUsePot = isUsePot
  }

  async login(){
    return new Promise((resolve)=>{
      this.socket.emit("CLIENT_LOGIN_SUBMIT", { username: this.user.username, password: this.user.password });
      this.socket.on("SERVER_LOGIN_DATA", (data)=>{
        this.token = data.token
        resolve();
      })
    })
  }

  async consumeItem(itemId){
    return new Promise(resolve=>{
      this.socket.emit("CLIENT_CONSUME_ITEM", {"token":this.token,"item_id":itemId})
      console.log("potion tomada.")
      resolve()
    })
  }

  async ranking(){
    const self = this
    return new Promise(resolve=>{
      self.socket.on("SERVER_SEND_RANKING", data=>{
        console.log(data.ranking.sort((a, b) => (a.level < b.level) ? 1 : -1))
      })
      resolve()
    })
  }

  async verifyLife(data){
    const {player: { hp_max, hp_curr, inventory } } = data
    const halfLife = hp_max/2;
    // const item = inventory["dd4e89bc-290b-4c0d-a1ef-d026a4cfaa7c"] // branha pot
    // console.log({hp_curr, halfLife})
    if(hp_curr < halfLife && this.isUsePot){
      // console.log("POTA FDP")
      let potions = []
      for (const key in inventory) {
        const _item = inventory[key];
        if(_item?.item_obj?.type == "consumable"){
          potions.push({
            id: _item.uuid,
            name: _item?.item_obj?.name,
            hp_curr: _item?.item_obj?.attributes?.hp_curr,
            quantity: _item.quantity
          })
        }
      }
      try{
        console.log(potions)
        potions = potions.filter(function (el) {
          return el.hp_curr != null || el.hp_curr!= undefined;
        });

        const biggerstPotionValue = Math.max.apply(Math, potions.map(function(o) { return o.hp_curr; }))
        const bigestPotion = potions.find(p=>(p.hp_curr == biggerstPotionValue))
  
        const item = inventory[bigestPotion.id]
        console.log(`Hora de tomar potion total de ${item?.quantity} life: ${hp_curr} de ${hp_max}`);
        await this.consumeItem(bigestPotion.id)
      }catch(e){
        console.log(e)
      }
    }
  }

  async changeLocation(locationName){
    const self = this;
    return new Promise(resolve=>{
      this.socket.emit("CLIENT_CLICK_LOCATION", {"token":self.token,"location_name":locationName})
      resolve()
    })
  }

  printTime(tickTime){
    this.timer += tickTime
    console.log(`
    -----------
    Tempo jogado: ${this.timer.toTime()}
    xp/hora ${parseInt(this.exp/60)} 
    updates: ${this.currentDate}
    Inimigo é boss: ${this.isBoss ? "SIM" : "NÃO"}
    -----------`)
  }
  processExp(){
    this.exp += this.oldData?.enemy?.exp || 0
  }
  async onUpdateByServer(){
    const self = this
    return new Promise((resolve)=>{

      self.socket.on("SERVER_UPDATE_DATA", (data)=>{
        const { player: { points, coins, exp_curr, exp_next, level, location }, enemy: { type } }= data
        self.verifyEquals(self.oldData, data)
        self.verifyLife(data);
        if(type=="boss"){
          if(this.isSkipBoss){
            this.mustStart = true
          }
          self.isBoss = true
        }else{
          self.isBoss = false
        }

        if(self.oldData?.player?.exp_curr != exp_curr){
          self.processExp()
          console.log(`${location} Exp atual ${exp_curr} de ${exp_next} points: ${points} level: ${level}`)
        }
        self.oldData = data
        self.currentDate += 1;
        if(self._points != points && this.attr){
          self.upStat(this.attr.toUpperCase())
        }
        self._points = points
      })

      resolve();

    })
  }
  // seta pra restart com bug do null
  verifyEquals(obj1, obj2){
    const keys = Object.keys(obj1?.player||{})
    for (const key of keys) {
      if(typeof obj1.player[key] != "object" && typeof obj1.player[key] != "undefined"){
        if(obj1.player[key] != obj2.player[key]){
          // console.log(`antes: ${key}:${obj1.player[key]} Depois ${key}:${obj2.player[key]}`)
          // console.log("----")
          if(key == "hp_curr" && obj2.player[key] == null){
            this.mustStart = true;
          }
        }
      }
    }
  }

  async upStat(stat){
    this.socket.emit("CLIENT_CLICK_ATTRIBUTE", { "token": this.token, "attribute": stat, "ammount": 1 });
  }

  async logout(){
    this.socket.emit("CLIENT_LOGOFF")
    return;
  }

  async buyItem(){
    this.socket.emit("CLIENT_BUY_ITEM", { "token": this.token, "item_id":9 });
  }

  async clear(){
    this.socket.off("SERVER_LOGIN_DATA");
    this.socket.off("SERVER_UPDATE_DATA");
    this.socket.off("SERVER_SEND_RANKING");
    this.socket.removeAllListeners();
    return 
  }

  static async init(params){
    const self = new this(params)
    let tick = 0
    setInterval(async ()=>{
      self.printTime(2000)
      if(self.mustStart||tick==self.currentDate){
        console.log(`Iniciando ${self.resets}`)
        await self.clear();
        await self.logout()
        await self.login()
        await self.onUpdateByServer()
        // await self.ranking();
        self.mustStart = false;
        self.resets += 1
        self.currentDate = 0
        tick = 0
      }
      tick = +1
    }, 2000)
  }
}

Number.prototype.toTime = function(isSec) {
  var ms = isSec ? this * 1e3 : this,
      lm = ~(4 * !!isSec),  /* limit fraction */
      fmt = new Date(ms).toISOString().slice(11, lm);

  if (ms >= 8.64e7) {  /* >= 24 hours */
      var parts = fmt.split(/:(?=\d{2}:)/);
      parts[0] -= -24 * (ms / 8.64e7 | 0);
      return parts.join(':');
  }

  return fmt;
};

module.exports= Bot;
// Iceland
// GodLands
// null Ruins