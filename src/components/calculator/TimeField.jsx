import { useEffect, useRef, useState } from "react";

import { AM, PM, createTime } from "@/lib/calculations/time";
import {
  QUICK_MINUTES,
  normalizeParts,
  otherMeridiem,
  partsToTime,
  stepHour,
  stepMinute,
  toParts,
  typeHour,
  typeMinute,
} from "@/lib/timeEntry";

/** Move to a segment and select it, so the next digit replaces what is there. */
function selectSegment(input) {
  if (input === null) return;
  input.focus();
  input.select();
}

/** The half of the day a letter key asks for, if it asks for one at all. */
function meridiemFromKey(key) {
  if (key === "a" || key === "A") return AM;
  if (key === "p" || key === "P") return PM;
  return null;
}

function stepFromKey(key) {
  if (key === "ArrowUp") return 1;
  if (key === "ArrowDown") return -1;
  return 0;
}

/**
 * A single clock time, entered the way a phone wants to be typed into.
 *
 * Three segments — `4 : 15 PM` — each directly editable, plus one tap for the
 * common minutes and a "Now". Every edit publishes upward immediately: the
 * giant display follows along, and nothing here calculates anything.
 *
 * The canonical `"HH:MM"` time above is the source of truth. The segments held
 * here are the half-typed version of it, which is why they survive an hour
 * without a minute yet — that publishes an empty time, not a wrong one.
 *
 * `label` is what the field is called on screen, punctuation and all. Screen
 * readers hear it without the trailing colon, so a segment announces itself as
 * "Start hour" rather than "Start: hour".
 *
 * `autoFocus` puts the caret in the hour on arrival, so the first thing a user
 * types lands where a shift starts without them having to aim at anything.
 *
 * `onComplete` continues that idea past this one field: the moment the segments
 * make a whole time — the moment it appears in the display above — there is
 * nothing left for this field to collect, so focus is handed on. Choosing the
 * half of the day afterwards hands it on again, because that finishes the time
 * too.
 *
 * The half of the day is therefore chosen while typing rather than after: `p`
 * or `a` from either number segment, or a 24-hour hour like `16`.
 */
export default function TimeField({
  id,
  label,
  value,
  error,
  onChange,
  onComplete,
  defaultMeridiem,
  autoFocus = false,
  ref,
}) {
  const name = label.replace(/:$/, "");
  const [parts, setParts] = useState(() => toParts(value, defaultMeridiem));
  const [published, setPublished] = useState(value);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  /*
    The segments as they stand right now, rather than as they stood when this
    render began. Finishing a time moves focus out of the control inside the
    same keystroke that changed it, and the blur that follows arrives before
    React has re-rendered — so tidying up has to read this rather than a `parts`
    that is already one edit behind.
  */
  const latestParts = useRef(parts);

  // Re-read the segments whenever the time changes to something this control
  // did not publish itself — a reset, for instance.
  if (value !== published) {
    setPublished(value);
    setParts(toParts(value, defaultMeridiem));
  }

  useEffect(() => {
    latestParts.current = parts;
  }, [parts]);

  useEffect(() => {
    if (autoFocus) selectSegment(hourRef.current);
    // Arrival only: re-focusing on later renders would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function attachHour(node) {
    hourRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  /** Apply an edit and publish the time it makes. */
  function commit(next) {
    latestParts.current = next;
    setParts(next);
    const time = partsToTime(next);
    setPublished(time);
    onChange(time);
    return time;
  }

  /**
   * The segments now make a whole time, so this field is done and whoever owns
   * the form decides where the user goes next.
   */
  function afterTimeEntered(time) {
    if (time !== "") onComplete?.();
  }

  function handleHourChange(event) {
    const typed = typeHour(event.target.value, parts.meridiem);
    commit({ ...parts, hour: typed.hour, meridiem: typed.meridiem });
    // The hour is only ever followed by the minute, however it was typed.
    if (typed.done) selectSegment(minuteRef.current);
  }

  function handleMinuteChange(event) {
    const typed = typeMinute(event.target.value);
    const time = commit({ ...parts, minute: typed.minute });
    if (typed.done) afterTimeEntered(time);
  }

  /** Settle the half of the day, and move on if that finished the time. */
  function chooseMeridiem(meridiem) {
    afterTimeEntered(commit({ ...parts, meridiem }));
  }

  /** Keys both number segments answer to. Returns true when one was used. */
  function handleSharedKeys(event, segment) {
    const meridiem = meridiemFromKey(event.key);
    if (meridiem !== null) {
      event.preventDefault();
      chooseMeridiem(meridiem);
      return true;
    }

    const step = stepFromKey(event.key);
    if (step !== 0) {
      event.preventDefault();
      commit(
        segment === "hour"
          ? { ...parts, hour: stepHour(parts.hour, step) }
          : { ...parts, minute: stepMinute(parts.minute, step) },
      );
      return true;
    }

    return false;
  }

  function handleHourKeyDown(event) {
    if (handleSharedKeys(event, "hour")) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectSegment(minuteRef.current);
    }
  }

  function handleMinuteKeyDown(event) {
    if (handleSharedKeys(event, "minute")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectSegment(hourRef.current);
    }
  }

  function handleMeridiemKeyDown(event) {
    const meridiem = meridiemFromKey(event.key);
    if (meridiem !== null) {
      event.preventDefault();
      chooseMeridiem(meridiem);
      return;
    }
    if (stepFromKey(event.key) !== 0) {
      event.preventDefault();
      chooseMeridiem(otherMeridiem(parts.meridiem));
    }
  }

  function setNow() {
    const now = new Date();
    afterTimeEntered(
      commit(toParts(createTime(now.getHours(), now.getMinutes()))),
    );
  }

  /** Tidy half-typed segments, but only once the user has really left. */
  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const current = latestParts.current;
    const tidied = normalizeParts(current);
    if (
      tidied.hour !== current.hour ||
      tidied.minute !== current.minute ||
      tidied.meridiem !== current.meridiem
    ) {
      commit(tidied);
    }
  }

  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const describedBy = error === undefined ? undefined : errorId;
  const invalid = error === undefined ? undefined : "true";

  const segmentProps = {
    className: "wagez-time-segment",
    type: "text",
    inputMode: "numeric",
    autoComplete: "off",
    placeholder: "--",
    onFocus: (event) => event.target.select(),
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  };

  return (
    <div
      role='group'
      aria-labelledby={labelId}
      className='flex flex-col gap-1'
      onBlur={handleBlur}
    >
      <span className='wagez-field-label' id={labelId}>
        {label}
      </span>

      <div className='wagez-field wagez-time'>
        <input
          {...segmentProps}
          ref={attachHour}
          id={id}
          aria-label={`${name} hour`}
          value={parts.hour}
          onChange={handleHourChange}
          onKeyDown={handleHourKeyDown}
        />
        <span aria-hidden='true' className='wagez-time-colon'>
          :
        </span>
        <input
          {...segmentProps}
          ref={minuteRef}
          id={`${id}-minutes`}
          aria-label={`${name} minutes`}
          value={parts.minute}
          onChange={handleMinuteChange}
          onKeyDown={handleMinuteKeyDown}
        />
        <div
          className='wagez-meridiem'
          role='group'
          aria-label={`${name} AM or PM`}
        >
          {[AM, PM].map((meridiem) => (
            <button
              key={meridiem}
              type='button'
              aria-label={`${name} ${meridiem}`}
              aria-pressed={parts.meridiem === meridiem}
              onClick={() => chooseMeridiem(meridiem)}
              onKeyDown={handleMeridiemKeyDown}
            >
              {meridiem}
            </button>
          ))}
        </div>
      </div>

      {/* One row of one-press values: the quarter hours, and the time now. */}
      <div className='grid grid-cols-5 gap-1.5'>
        {QUICK_MINUTES.map((minute) => (
          <button
            key={minute}
            type='button'
            className='wagez-chip'
            aria-label={`${name} ${Number(minute)} minutes`}
            // aria-pressed={parts.minute === minute}
            onClick={() => afterTimeEntered(commit({ ...parts, minute }))}
          >
            :{minute}
          </button>
        ))}
        <button
          type='button'
          className='wagez-chip'
          aria-label={`Set ${name} to now`}
          onClick={setNow}
        >
          Now
        </button>
      </div>

      {error === undefined ? null : (
        <p className='wagez-alert' id={errorId} role='alert'>
          {error}
        </p>
      )}
    </div>
  );
}
