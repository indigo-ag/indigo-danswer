import { ChangeEvent, FC, useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons/icons";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { FaRobot } from "react-icons/fa";

export interface Option<T> {
  name: string;
  value: T;
  description?: string;
  metadata?: { [key: string]: any };
}

export type StringOrNumberOption = Option<string | number>;

interface DropdownProps<T> {
  options: Option<T>[];
  selected: string;
  onSelect: (selected: Option<T> | null) => void;
}

export const Dropdown = ({
  options,
  selected,
  onSelect,
}: DropdownProps<string | number>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedName = options.find(
    (option) => option.value === selected
  )?.name;

  const handleSelect = (option: StringOrNumberOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`inline-flex 
          justify-center 
          w-full 
          px-4 
          py-3
          text-sm 
          bg-gray-700 
          border 
          border-gray-300 
          rounded-md 
          shadow-sm 
          hover:bg-gray-700 
          focus:ring focus:ring-offset-0 focus:ring-1 focus:ring-offset-gray-800 focus:ring-blue-800
          `}
          id="options-menu"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedName ? <p>{selectedName}</p> : "Select an option..."}
          <ChevronDownIcon className="text-gray-400 my-auto ml-auto" />
        </button>
      </div>

      {isOpen ? (
        <div className="origin-top-right absolute left-0 mt-3 w-full rounded-md shadow-lg bg-gray-700 border-2 border-gray-600">
          <div
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                className={
                  `w-full text-left block px-4 py-2.5 text-sm hover:bg-gray-800` +
                  (index !== 0 ? " border-t-2 border-gray-600" : "")
                }
                role="menuitem"
              >
                <p className="font-medium">{option.name}</p>
                {option.description && (
                  <div>
                    <p className="text-xs text-gray-300">
                      {option.description}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

function StandardDropdownOption<T>({
  index,
  option,
  handleSelect,
}: {
  index: number;
  option: Option<T>;
  handleSelect: (option: Option<T>) => void;
}) {
  return (
    <button
      onClick={() => handleSelect(option)}
      className={`w-full text-left block px-4 py-2.5 text-sm hover:bg-gray-800 ${
        index !== 0 ? " border-t-2 border-gray-600" : ""
      }`}
      role="menuitem"
    >
      <p className="font-medium">{option.name}</p>
      {option.description && (
        <div>
          <p className="text-xs text-gray-300">{option.description}</p>
        </div>
      )}
    </button>
  );
}

export function SearchMultiSelectDropdown({
  options,
  onSelect,
  itemComponent,
}: {
  options: StringOrNumberOption[];
  onSelect: (selected: StringOrNumberOption) => void;
  itemComponent?: FC<{ option: StringOrNumberOption }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: StringOrNumberOption) => {
    onSelect(option);
    setIsOpen(false);
    setSearchTerm(""); // Clear search term after selection
  };

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <div>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (!searchTerm) {
              setIsOpen(true);
            }
            if (!e.target.value) {
              setIsOpen(false);
            }
            setSearchTerm(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          className={`inline-flex 
          justify-between 
          w-full 
          px-4 
          py-2 
          text-sm 
          bg-gray-700 
          rounded-md 
          shadow-sm 
          focus:ring focus:ring-offset-0 focus:ring-1 focus:ring-offset-gray-800 focus:ring-blue-800`}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className={`absolute top-0 right-0 
            text-sm 
            h-full px-2 border-l border-gray-800`}
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDownIcon className="text-gray-400 my-auto" />
        </button>
      </div>

      {isOpen && (
        <div
          className={`origin-top-right
            absolute
            left-0
            mt-3
            w-full
            rounded-md
            shadow-lg
            bg-gray-700
            border-2
            border-gray-600
            max-h-80
            overflow-y-auto
            overscroll-contain`}
        >
          <div
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option, index) =>
                itemComponent ? (
                  <div
                    key={option.name}
                    onClick={() => {
                      setIsOpen(false);
                      handleSelect(option);
                    }}
                  >
                    {itemComponent({ option })}
                  </div>
                ) : (
                  <StandardDropdownOption
                    key={index}
                    option={option}
                    index={index}
                    handleSelect={handleSelect}
                  />
                )
              )
            ) : (
              <button
                key={0}
                className={`w-full text-left block px-4 py-2.5 text-sm hover:bg-gray-800`}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                No matches found...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const CustomDropdown = ({
  children,
  dropdown,
}: {
  children: JSX.Element | string;
  dropdown: JSX.Element | string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{children}</div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="pt-2 absolute bottom w-full z-30 bg-gray-900"
        >
          {dropdown}
        </div>
      )}
    </div>
  );
};

function DefaultDropdownElement({
  id,
  name,
  description,
  onSelect,
  isSelected,
  isFinal,
}: {
  id: string | number | null;
  name: string;
  description?: string;
  onSelect: (value: string | number | null) => void;
  isSelected: boolean;
  isFinal: boolean;
}) {
  console.log(isFinal);
  return (
    <div
      className={`
        flex
        px-3 
        text-sm 
        text-gray-200 
        py-2.5 
        select-none 
        cursor-pointer 
        ${isFinal ? "" : "border-b border-gray-800"} 
        ${
          isSelected
            ? "bg-dark-tremor-background-muted"
            : "hover:bg-dark-tremor-background-muted "
        }
      `}
      onClick={() => {
        onSelect(id);
      }}
    >
      <div>
        {name}
        {description && (
          <div className="text-xs text-dark-tremor-content">{description}</div>
        )}
      </div>
      {isSelected && (
        <div className="ml-auto mr-1 my-auto">
          <FiCheck />
        </div>
      )}
    </div>
  );
}

export function DefaultDropdown({
  options,
  selected,
  onSelect,
  includeDefault = false,
}: {
  options: StringOrNumberOption[];
  selected: string | null;
  onSelect: (value: string | number | null) => void;
  includeDefault?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === selected);

  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
            border 
            border-gray-800 
            rounded-lg 
            flex 
            flex-col 
            max-h-96 
            overflow-y-auto 
            overscroll-contain`}
        >
          {includeDefault && (
            <DefaultDropdownElement
              key={-1}
              id={null}
              name="Default"
              onSelect={() => {
                onSelect(null);
              }}
              isSelected={selected === null}
              isFinal={false}
            />
          )}
          {options.map((option, ind) => {
            const isSelected = option.value === selected;
            return (
              <DefaultDropdownElement
                key={option.value}
                id={option.value}
                name={option.name}
                description={option.description}
                onSelect={onSelect}
                isSelected={isSelected}
                isFinal={ind === options.length - 1}
              />
            );
          })}
        </div>
      }
    >
      <div
        className={`
            flex 
            text-sm 
            text-gray-400 
            px-3
            py-1.5 
            rounded-lg 
            border 
            border-gray-800 
            cursor-pointer 
            hover:bg-dark-tremor-background-muted`}
      >
        <p className="text-gray-200 line-clamp-1">
          {selectedOption?.name ||
            (includeDefault ? "Default" : "Select an option...")}
        </p>
        <FiChevronDown className="my-auto ml-auto" />
      </div>
    </CustomDropdown>
  );
}
