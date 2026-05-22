---
title: CNC Machining Practices
description: A cleaned-up checklist from my original CNC machining notes.
---

[← Notes](/notes)

# CNC Machining Practices

The point of this note is to keep the manufacturing constraints in my head while designing: cutter geometry, tool stiffness, chip clearing, workholding, setups, and tolerance.

A 3-axis mill mostly approaches from `Z`. The cutter is round. Small/long tools deflect. The part starts as stock, gets clamped, and every re-clamp is another setup with another chance for alignment error.

## Checklist

1. Internal fillets should be as large as possible.
   - Larger radii allow larger cutters, which usually means faster machining.
   - Keep the radius generous relative to the depth of cut. Tiny radii in deep pockets force tiny, flexible tools.
   - The part radius should always be slightly larger than the cutter radius. If they are equal, the cutter suddenly engages more material at the corner, which can chatter, hurt finish, or break the tool.

2. Use dogbone corners when a square internal corner is actually required.
   - Make the circular relief as large as the design can tolerate.

3. Avoid tall, thin features.
   - Rule of thumb: `H < 4W`, where `W` is the width of the feature.
   - Tall skinny geometry vibrates, which causes poor tolerances, poor surface finish, and broken tools.
   - Reinforce the feature when possible.

4. Prefer through tapped holes over blind tapped holes.
   - Chips can evacuate out the bottom.
   - Coolant flow is easier.

5. Do not over-specify thread depth.
   - Rule of thumb: `L < 3D`, where `D` is thread diameter.
   - Past that, there is little added connection strength; it mostly gets harder to machine.

6. For blind tapped holes, leave clearance below the threads.
   - Leave more than `0.5D` of pilot drill depth below the threaded section so the tap has room.

7. Design around available raw stock.
   - Make sure the finished part fits inside common raw-stock dimensions.
   - Check metal suppliers before locking the design.

8. Leave material for workholding and cleanup.
   - Leave at least `3 mm` below the part so the vise has something to grip.
   - Leave at least `1 mm` around the part for a finishing pass and dimensional accuracy.

9. Only model chamfers when the chamfer dimension matters.
   - If the goal is just to remove sharpness, call out `break sharp edges`.
   - Keep chamfers at or below `45 degrees` when possible, since `45 degrees` is a common tool angle.
   - Different chamfer widths can often be cut with the same tool by changing tool position.

10. Minimize setups.
    - A setup is every time the part is clamped and located.
    - Fewer setups reduce time, cost, and alignment error.
    - Features machined in one setup share the same coordinate frame, so they are usually more accurate relative to one another.
    - Side features often require another setup on a 3-axis mill because the cutter approaches from `Z`.

11. External corner radii are basically free.
    - Unlike internal radii, outside radii do not force a smaller cutter.
    - Use them to remove sharp/weak corners and reduce the chance of scratching or damaging other parts during assembly.

12. For high flatness, reduce the precision area.
    - Use small bosses or contact pads instead of making a large surface perfectly flat.
    - Smaller tolerance zones are easier to machine, inspect, and hold.

13. Keep drilled holes reasonable.
    - Rule of thumb: `L < 6D`, where `D` is drill diameter.
    - Deeper holes need specialized tooling or extra care.
    - Drilling from both sides can work, but the meeting point may be misaligned.

14. Avoid flat-bottom holes unless the flat bottom is functional.
    - Standard drills leave angled bottoms.
    - Flat-bottom holes require special tooling or another operation.

15. Avoid floor fillets in deep pockets.
    - They are hard to machine cleanly.
    - If the floor fillet matters, use the largest/common radius the design allows, ideally something that matches available bullnose or ball-end tooling.

16. Do not use top-edge fillets as a normal edge break.
    - Use a chamfer or `break sharp edges` instead.
    - A modeled radius may require matched tooling or slow surfacing.

17. Keep the full drill diameter inside the part.
    - If the drill partially breaks out over an edge, the drill can wander or break.
    - It can also leave a poor finish or a folded sharp edge.
    - If a partial hole is unavoidable, drill it before milling away the surrounding material.

18. Avoid complex 3D surfaces unless they are necessary.
    - They are slow because a ball end mill has to sweep across the surface.
    - If the surface is necessary, make it reachable with the largest reasonable ball end mill.

19. Avoid undercuts.
    - They often need special tooling or additional setups.
    - If an undercut is necessary, minimize the material that must be undercut.

20. Avoid raised text.
    - Raised text creates tiny internal corners and pockets around letters.
    - Prefer engraved text with a V-bit or ball end mill.

## Source

Cleaned up from my original Obsidian note on CNC machining practices, based on Adam Bender's [How to Design Parts for CNC Machining](https://youtu.be/qx_qqVmjCc0) and the Autodesk University handout that expands on the same ideas.
