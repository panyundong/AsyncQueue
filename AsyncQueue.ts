/*
 * @CreateTime: Feb 2, 2018 2:52 PM
 * @Author: howe
 * @Contact: ihowe@outlook.com
 * @Last Modified By: howe
 * @Last Modified Time: Sep 17, 2018 11:47 AM
 * @Description: 异步队列处理
 * 
 * 目的：用于处理一组串联式的异步任务队列。
 * 
 */
interface AsyncTask{
    /**
     * 任务ID
     */
   uuid:number;
   /**
     * 任务开始执行的回调
     * params: push时传入的参数
     * args: 上个任务传来的参数
     */
   callback:(next: Function, params: any,args:any)=>void;
   /**
     * 任务参数
     */
   params:any
}
export class AsyncQueue{
   // 调试用
   private _debugModeInfo:any = null;

   // 任务task的唯一标识
   private static _$uuid_count:number = 1;

   private _queues:Array<AsyncTask > = [];
   
   // 正在执行的异步任务标识
   private _isProcessingTaskUUID:number = 0;

   private _enable:boolean = true;
   /**
    * 是否开启可用
    */
   public get enable(){
       return this._enable;
   }
   /**
    * 是否开启可用
    */
   public set enable(val:boolean){
       if (this._enable === val){
           return;
       }
       this._enable = val;
       if (val && this.size > 0){
           this.play();
       }
   }

   /**
    * 任务队列完成回调
    */
   public complete:Function = null;
   /**
    * push一个异步任务到队列中
    */
   public push( callback: (next: Function, params: any , args:any )=>void , params:any = null ){
       this._queues.push({
           uuid : AsyncQueue._$uuid_count++,
           callback: callback,
           params:params
       })
   }
   /**
    * 队列长度
    */
   public get size():number{
       return this._queues.length;
   }
   /**
    * 是否有正在处理的任务
    */
   public get isProcessing():boolean{
       return this._isProcessingTaskUUID > 0;
   }
   /**
    * 队列是否已停止
    */
   public get isStop():boolean{
       if (this._queues.length > 0){
           return false;
       }
       if (this.isProcessing){
           return false;
       }
       return true;
   }

   public get runningParams(){
    if (this._debugModeInfo){
        return this._debugModeInfo.params;
    }
    return null;
}

   /**
    * 清空队列
    */
   public clear(){
        this._queues = [];
        this._isProcessingTaskUUID = 0;
        this._debugModeInfo = null;
   }

   protected next( taskUUID:number, args:any = null ){
       // cc.log("完成一个任务")
       if (this._isProcessingTaskUUID === taskUUID){
           this._isProcessingTaskUUID = 0;
           this._debugModeInfo = null;
           this.play( args ); 
       }else{
           cc.warn("[AsyncQueue] 错误警告：正在执行的任务和完成的任务标识不一致，有可能是next重复执行！ProcessingTaskUUID："+this._isProcessingTaskUUID + " nextUUID:"+taskUUID)
           if (this._debugModeInfo){
               cc.log(this._debugModeInfo);
           }
       }
   }
   /**
    * 跳过当前正在执行的任务
    */
   public step(){
       if (this.isProcessing){
           this.next( this._isProcessingTaskUUID );
       }
   }
   /**
    * 开始运行队列
    */
   public play( args:any = null ){
       if (this.isProcessing){
           return;
       }
       if (!this._enable){
           return;
       }
       let actionData:AsyncTask = this._queues.shift();
       if (actionData){
           this._debugModeInfo = actionData;
           let taskUUID:number = actionData.uuid;
           this._isProcessingTaskUUID = taskUUID;
           let func = ( previousArgs:any = null )=>{
               this.next( taskUUID ,previousArgs );
           }
           actionData.callback( func , actionData.params, args );
       }else{
           this._isProcessingTaskUUID = 0;
           this._debugModeInfo = null;
           // cc.log("任务完成")
           if (this.complete){
               this.complete(args);
           }
       }
   }

   /**
    * 【比较常用，所以单独提出来封装】往队列中push一个延时任务
    * @param time 毫秒时间
    * @param callback （可选参数）时间到了之后回调
    */
   public yieldTime(time:number,callback:Function = null){
       let task = function ( next:Function,params:any){
           let _t = setTimeout( ()=>{
               clearTimeout(_t);
               if (callback){
                   callback();
               }
               next();
           } ,time);
       }
       this.push(task,{des:"delay_Time"});
   }

   /**
    * 返回一个执行函数，执行函数调用count次后，next将触发
    * @param count 
    * @param next 
    * @return 返回一个匿名函数
    */
   public static excuteTimes( count:number, next:Function=null ):Function{
       let fnum:number = count;
       let tempCall = ()=>{
           --fnum;
           if ( fnum === 0){
               next && next();
           }
       }
       return tempCall;
   }
}
