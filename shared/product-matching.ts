export const tokenize = (value:string):string[] => value.toLowerCase().match(/[a-z]+|[0-9]+/g)||[];

/** Controlled variants must agree during both registration and report matching. */
export function sameSpecificationVariant(sampleName:string,productName:string){
 const qualifiers=(value:string)=>{
  const words=new Set(tokenize(value));
  return {
   export:words.has('export'),
   pro:words.has('pro'),
   local:words.has('omega')&&words.has('local'),
   // Other products may carry Old Specs without a separate checklist row.
   oldSpecs:words.has('omega')&&/\bold\s+specs\b/i.test(value)
  };
 };
 const sample=qualifiers(sampleName),product=qualifiers(productName);
 return sample.export===product.export&&sample.pro===product.pro&&sample.local===product.local&&sample.oldSpecs===product.oldSpecs;
}
