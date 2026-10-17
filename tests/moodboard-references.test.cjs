const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={view:'home',tab:'mood',render(){},moodboardMarkup(){},drawMoodboardPages:p=>Promise.resolve(p.boards),document:{addEventListener(){}},Promise,Error};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/moodboard-references.js','utf8'),ctx);
(async()=>{
 const project={boards:[{image:'legacy'},{image:'style',kind:'stylisme'},{image:'direction',kind:'da'},{image:'',kind:'da'}]};
 let pages=await ctx.drawMoodboardPages(project);assert.deepEqual(Array.from(pages,b=>b.image),['legacy','style']);
 vm.runInContext("activeMoodKind='da'",ctx);pages=await ctx.drawMoodboardPages(project);assert.deepEqual(Array.from(pages,b=>b.image),['direction']);
 assert.equal(project.boards.length,4);ctx.tab='overview';pages=await ctx.drawMoodboardPages(project);assert.deepEqual(Array.from(pages,b=>b.image),['legacy','style']);
 ctx.tab='mood';await assert.rejects(ctx.drawMoodboardPages({boards:[]}),/Aucune inspiration/);
 console.log('Moodboards : anciennes références conservées, DA et stylisme séparés à l’export, absence de visuel traitée.');
})().catch(e=>{console.error(e);process.exitCode=1});
