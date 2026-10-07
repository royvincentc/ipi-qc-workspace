/** A conservative default; users can opt into the workflow motion preview. */
export function isConstrainedDevice(){
  if(typeof navigator==='undefined')return false;
  const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
  return Boolean(device.connection?.saveData)
    || (device.hardwareConcurrency>0&&device.hardwareConcurrency<=4)
    || (typeof device.deviceMemory==='number'&&device.deviceMemory<=4);
}
