import React from 'react';
import { D2ManifestDefinitions } from '../destiny2/d2-definitions.service';
import './PresentationNode.scss';
import Collectible from './Collectible';
import { DestinyProfileResponse, DestinyPresentationScreenStyle } from 'bungie-api-ts/destiny2';
import { InventoryBuckets } from '../inventory/inventory-buckets';
import BungieImage from '../dim-ui/BungieImage';
import Record from './Record';
import classNames from 'classnames';
import { expandIcon, collapseIcon, AppIcon } from '../shell/icons';
import { deepEqual } from 'fast-equals';
import { percent } from '../shell/filters';
import { scrollToPosition } from 'app/dim-ui/scroll';

import { setSetting } from '../settings/actions';
import { RootState } from '../store/reducers';
import Checkbox from '../settings/Checkbox';
import { Settings } from '../settings/reducer';
import { connect } from 'react-redux';
import { settings } from '../settings/settings';

interface StoreProps {
  presentationNodeHash: number;
  defs: D2ManifestDefinitions;
  buckets?: InventoryBuckets;
  profileResponse: DestinyProfileResponse;
  ownedItemHashes?: Set<number>;
  path: number[];
  parents: number[];
  collectionCounts: {
    [nodeHash: number]: {
      acquired: number;
      visible: number;
    };
  };
  onNodePathSelected(nodePath: number[]);
  settings: Settings;
  setSetting;
}

const rootNodes = [3790247699];

function mapStateToProps(state: RootState) {
  return {
    settings: state.settings
  };
}
const mapDispatchToProps = {
  setSetting
};
type DispatchProps = typeof mapDispatchToProps;
type Props = StoreProps & DispatchProps;
function isInputElement(element: HTMLElement): element is HTMLInputElement {
  return element.nodeName === 'INPUT';
}

export class PresentationNode extends React.Component<Props> {
  private headerRef = React.createRef<HTMLDivElement>();
  private lastPath: number[];

  //private setCompletedRecordsHidden = (e: React.ChangeEvent<HTMLInputElement>) => {
  //  this.setState({ completedRecordsHidden: e.currentTarget.checked });
  //};
  //private setRedactedRecordsHidden = (e: React.ChangeEvent<HTMLInputElement>) => {
  //  this.setState({ redactedRecordsHidden: e.currentTarget.checked });
  //};

  private onChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> = (e) => {
    if (e.target.name.length === 0) {
      console.error(new Error('You need to have a name on the form input'));
    }

    if (isInputElement(e.target) && e.target.type === 'checkbox') {
      this.props.setSetting(e.target.name as any, e.target.checked);
    } else {
      this.props.setSetting(e.target.name as any, e.target.value);
    }
  };

  componentDidUpdate() {
    if (
      this.headerRef.current &&
      this.props.path[this.props.path.length - 1] === this.props.presentationNodeHash &&
      !deepEqual(this.lastPath, this.props.path)
    ) {
      const clientRect = this.headerRef.current.getBoundingClientRect();
      scrollToPosition({
        top: window.scrollY + clientRect.top - 50,
        left: 0,
        behavior: 'smooth'
      });
    }
    this.lastPath = this.props.path;
  }
  render() {
    const {
      presentationNodeHash,
      defs,
      profileResponse,
      buckets,
      ownedItemHashes,
      path,
      collectionCounts,
      onNodePathSelected
    } = this.props;
    const presentationNodeDef = defs.PresentationNode.get(presentationNodeHash);
    if (presentationNodeDef.redacted) {
      return null;
    }

    if (!presentationNodeDef) {
      return (
        <div className="dim-error">
          <h2>Bad presentation node</h2>
          <div>This isn't real {presentationNodeHash}</div>
        </div>
      );
    }

    const { visible, acquired } = collectionCounts[presentationNodeHash];

    if (!visible) {
      return null;
    }

    const parents = [...this.props.parents, presentationNodeHash];

    const defaultExpanded =
      parents[0] !== 1024788583 &&
      parents.length >=
        (parents.some(
          (p) =>
            defs.PresentationNode.get(p).screenStyle === DestinyPresentationScreenStyle.CategorySets
        )
          ? 5
          : 4);

    const onlyChild =
      this.props.parents.length > 0 &&
      defs.PresentationNode.get(this.props.parents[this.props.parents.length - 1]).children
        .presentationNodes.length === 1;
    const childrenExpanded =
      onlyChild ||
      defaultExpanded ||
      path.includes(presentationNodeHash) ||
      rootNodes.includes(presentationNodeHash);

    // TODO: hey, the image for the heavy/special/primary categories is the icon!

    const displayStyle = {
      /** Display the item as a category, through which sub-items are filtered. */
      0: 'Category',
      1: 'Badge',
      2: 'Medals',
      3: 'Collectible',
      4: 'Record'
    };

    const screenStyle = {
      0: 'Default',
      1: 'CategorySets',
      2: 'Badge'
    };

    const nodeStyle = {
      0: 'Default',
      1: 'Category',
      2: 'Collectibles',
      3: 'Records'
    };

    const title = (
      <span className="node-name">
        {presentationNodeDef.displayProperties.icon && (
          <BungieImage src={presentationNodeDef.displayProperties.icon} />
        )}{' '}
        {presentationNodeDef.displayProperties.name}
      </span>
    );

    return (
      <div
        className={classNames(
          'presentation-node',
          `display-style-${displayStyle[presentationNodeDef.displayStyle]}`,
          `screen-style-${screenStyle[presentationNodeDef.screenStyle]}`,
          `node-style-${nodeStyle[presentationNodeDef.nodeType]}`,
          `level-${parents.length}`,
          { 'only-child': onlyChild }
        )}
      >
        {!rootNodes.includes(presentationNodeHash) && !onlyChild && (
          <div
            className={defaultExpanded ? 'leaf-node' : 'title'}
            onClick={this.expandChildren}
            ref={this.headerRef}
          >
            {defaultExpanded ? (
              title
            ) : (
              <span className="collapse-handle">
                <AppIcon className="collapse" icon={childrenExpanded ? collapseIcon : expandIcon} />{' '}
                {title}
              </span>
            )}
            <div className="node-progress">
              <div className="node-progress-count">
                {acquired} / {visible}
              </div>
              <div className="node-progress-bar">
                <div
                  className="node-progress-bar-amount"
                  style={{ width: percent(acquired / visible) }}
                />
              </div>
            </div>
          </div>
        )}
        {childrenExpanded && presentationNodeHash === 1024788583 && (
          <div className="presentationNodeOptions">
            <Checkbox
              label="Hide Completed" //{t('Settings.AllowIdPostToDtr')}
              name="completedRecordsHidden"
              value={settings.completedRecordsHidden}
              onChange={this.onChange} //onChange={this.setCompletedRecordsHidden
            />
            <Checkbox
              label="Reveal Redacted" //{t('Settings.AllowIdPostToDtr')}
              name="redactedRecordsRevealed"
              value={settings.redactedRecordsRevealed}
              onChange={this.onChange} //onChange={this.setRedactedRecordsHidden}
            />
          </div>
        )}
        {childrenExpanded &&
          presentationNodeDef.children.presentationNodes.map((node) => (
            <PresentationNode
              key={node.presentationNodeHash}
              presentationNodeHash={node.presentationNodeHash}
              defs={defs}
              profileResponse={profileResponse}
              buckets={buckets}
              ownedItemHashes={ownedItemHashes}
              path={path}
              parents={parents}
              onNodePathSelected={onNodePathSelected}
              collectionCounts={collectionCounts}
              settings={settings}
              setSetting={setSetting}
            />
          ))}
        {childrenExpanded && visible > 0 && (
          <>
            {presentationNodeDef.children.collectibles.length > 0 && (
              <div className="collectibles">
                {buckets &&
                  presentationNodeDef.children.collectibles.map((collectible) => (
                    <Collectible
                      key={collectible.collectibleHash}
                      collectibleHash={collectible.collectibleHash}
                      defs={defs}
                      profileResponse={profileResponse}
                      buckets={buckets}
                      ownedItemHashes={ownedItemHashes}
                    />
                  ))}
              </div>
            )}
            {presentationNodeDef.children.records.length > 0 && (
              <div className="records">
                {presentationNodeDef.children.records.map((record) => (
                  <Record
                    key={record.recordHash}
                    recordHash={record.recordHash}
                    defs={defs}
                    profileResponse={profileResponse}
                    completedRecordsHidden={settings.completedRecordsHidden}
                    redactedRecordsRevealed={settings.redactedRecordsRevealed}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  private expandChildren = () => {
    const { presentationNodeHash, parents, path } = this.props;
    const childrenExpanded =
      path.includes(presentationNodeHash) || rootNodes.includes(presentationNodeHash);
    this.props.onNodePathSelected(childrenExpanded ? parents : [...parents, presentationNodeHash]);
    return false;
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PresentationNode);
