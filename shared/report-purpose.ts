import type {Sample} from './model.js';

export function reportPurpose(sample:Pick<Sample,'category'|'fields'>,manual:Record<string,string>={}){
 if(Object.prototype.hasOwnProperty.call(manual,'purpose'))return manual.purpose;
 return [sample.fields.purpose,sample.fields.type,sample.fields.Type,sample.category==='ST'?sample.fields.context:undefined].find(value=>value?.trim())||'';
}
