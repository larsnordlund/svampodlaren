"use client";

import { useState, type ReactNode } from "react";
import photos from "@/lib/species-photos.json";

export function SpeciesPhoto({
  name,
  className,
  children,
  eager = false,
}: {
  name: string;
  className: string;
  children?: ReactNode;
  eager?: boolean;
}) {
  const photo = photos.find(
    (photo) =>
      photo.name.toLocaleLowerCase("sv-SE") === name.toLocaleLowerCase("sv-SE"),
  );
  const [failedSource, setFailedSource] = useState("");
  const source = photo ? "/images/mushrooms/" + photo.file : "";
  const visible = photo && failedSource !== source;
  return (
    <figure className={className}>
      {visible ? (
        <>
          <img
            className="species-photo"
            src={source}
            alt={name}
            width={960}
            height={640}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailedSource(source)}
          />
          <figcaption className="photo-credit">
            Foto:{" "}
            <a href={photo.source} target="_blank" rel="noreferrer">
              {photo.author}
            </a>
            {" · "}
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
              {photo.license}
            </a>
            {" · beskuren"}
          </figcaption>
        </>
      ) : (
        <div
          className="photo-missing"
          role="img"
          aria-label={"Bild saknas för " + name}
        >
          <span>Bild saknas</span>
        </div>
      )}
      {children}
    </figure>
  );
}
