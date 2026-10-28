"use client";

import { useState, type ReactNode } from "react";
import photos from "@/lib/species-photos.json";

export function SpeciesPhoto({
  name,
  image,
  className,
  children,
  eager = false,
}: {
  name: string;
  image?: string;
  className: string;
  children?: ReactNode;
  eager?: boolean;
}) {
  const photo = photos.find(
    (photo) =>
      photo.name.toLocaleLowerCase("sv-SE") === name.toLocaleLowerCase("sv-SE"),
  );
  const [failedSource, setFailedSource] = useState("");
  const source = image || (photo ? "/images/mushrooms/" + photo.file : "");
  const visible = source && failedSource !== source;
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
          {image ? (
            <figcaption className="photo-credit">Egen bild</figcaption>
          ) : (
            photo && (
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
            )
          )}
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
