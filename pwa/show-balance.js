/* Prefer fresh questions and rotate topics rather than filling quizzes with the largest bank. */
function balanceByTopic(pool,n){
 const groups=new Map();for(const q of shuffle(pool)){const topic=q.topic||q.category||'Overig';if(!groups.has(topic))groups.set(topic,[]);groups.get(topic).push(q);}
 const topics=shuffle([...groups.keys()]);const result=[];
 while(result.length<n){let progress=false;for(const topic of topics){const group=groups.get(topic);if(group.length){result.push(group.pop());progress=true;if(result.length>=n)break;}}if(!progress)break;}
 return result;
}
const basePickQuestions=pickQuestions;
pickQuestions=function(list,n,difficulty='all'){
  const all=basePickQuestions(list,list.length,difficulty);
  if(all.length<=n)return all;
  const buckets=new Map();
  for(const q of all){const topic=q.topic||q.category||'Overig';if(!buckets.has(topic))buckets.set(topic,[]);buckets.get(topic).push(q);}
  const topics=shuffle([...buckets.keys()]);
  const out=[];
  while(out.length<n){let advanced=false;
    for(const topic of topics){const bucket=buckets.get(topic);if(bucket.length){out.push(bucket.pop());advanced=true;if(out.length===n)break;}}
    if(!advanced)break;
  }
  return out;
};
