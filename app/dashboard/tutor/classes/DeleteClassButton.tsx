"use client";

export function DeleteClassButton({classTitle}:{classTitle:string}){
  return <button className="danger-button" type="submit" onClick={event=>{if(!window.confirm(`Delete “${classTitle}”? This scheduled class will be removed from the tutor and learner calendars.`))event.preventDefault();}}>Delete</button>;
}

