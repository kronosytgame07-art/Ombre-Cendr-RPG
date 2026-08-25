// Gestion clavier + souris centralisée.
class InputManager{
  constructor(){
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = {x:0, y:0, worldX:0, worldY:0, down:false, justDown:false, rightDown:false};
    window.addEventListener('keydown', e=>{
      if(e.repeat) return;
      const k = e.key.toLowerCase();
      if(!this.keys.has(k)) this.justPressed.add(k);
      this.keys.add(k);
      if(['1','2','3','4','5','i','k','j','m','escape',' '].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e=>{ this.keys.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', ()=>{ this.keys.clear(); this.mouse.down=false; });
  }
  bindCanvas(canvas, camera){
    canvas.addEventListener('mousemove', e=>{
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX-r.left) * (canvas.width/r.width);
      this.mouse.y = (e.clientY-r.top) * (canvas.height/r.height);
      if(camera){
        this.mouse.worldX = this.mouse.x/camera.zoom + camera.x;
        this.mouse.worldY = this.mouse.y/camera.zoom + camera.y;
      }
    });
    canvas.addEventListener('mousedown', e=>{
      if(e.button===0){ this.mouse.down=true; this.mouse.justDown=true; }
      if(e.button===2){ this.mouse.rightDown=true; }
    });
    window.addEventListener('mouseup', e=>{
      if(e.button===0) this.mouse.down=false;
      if(e.button===2) this.mouse.rightDown=false;
    });
    canvas.addEventListener('contextmenu', e=>e.preventDefault());
  }
  isDown(k){ return this.keys.has(k); }
  wasPressed(k){ return this.justPressed.has(k); }
  endFrame(){ this.justPressed.clear(); this.mouse.justDown=false; }
  setVirtualKey(key,down){
    key=key.toLowerCase();
    if(down){if(!this.keys.has(key))this.justPressed.add(key);this.keys.add(key);}
    else this.keys.delete(key);
  }
}
export const Input = new InputManager();
